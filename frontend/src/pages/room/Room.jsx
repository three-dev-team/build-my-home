import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import { leaveRoom } from '../../utils/leaveUtils.js';
import { getBrokerURL } from '../../utils/ws.js';
import { getMyIdFromToken } from '../../utils/auth.js';
import { CHARACTERS } from '../../constants/characters.js';
import { COLORS } from '../../constants/colors.js';
import './Room.css';
import {
  UserIcon,
  BellIcon,
  Cog6ToothIcon,
  ChatBubbleLeftEllipsisIcon,
  SparklesIcon,
  ArrowUturnLeftIcon,
  StarIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/solid';
import ExitButton from '../../components/common/ExitButton';
import AspectLayout from '../../components/layout/AspectLayout';

// 캐릭터 ID -> 이미지 매핑 (전신 이미지 사용)
const CHARACTER_IMG_MAP = CHARACTERS.reduce((acc, char) => {
  // Room Waiting에서는 전신 이미지가 필요함. houseImage도 있지만 여기선 selectBasicImage(전신/플로팅) 사용
  acc[Number(char.id)] = char.selectBasicImage;
  return acc;
}, {});

function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const token = sessionStorage.getItem('token');
  const myId = getMyIdFromToken();

  const [loading, setLoading] = useState(true);
  const [roomTitle, setRoomTitle] = useState('');
  const [players, setPlayers] = useState([]);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [totalRounds, setTotalRounds] = useState(null);
  const [stompClient, setStompClient] = useState(null);
  const [lockedSlots, setLockedSlots] = useState(new Set()); // 잠긴 슬롯 목록 (1-based)

  // URL 직접 접속 차단 - 정상 경로(RoomList)에서만 입장 가능
  useEffect(() => {
    const joinedRoom = sessionStorage.getItem('joinedRoom');
    if (joinedRoom !== roomId) {
      // 정상 경로로 입장하지 않은 경우 룸리스트로 리다이렉트
      navigate('/room-list', { replace: true });
    }
  }, [roomId, navigate]);

  // 상태 (States)
  const [targetStartTime, setTargetStartTime] = useState(null);
  const [countDown, setCountDown] = useState(null);
  const [hostCountDown, setHostCountDown] = useState(null);
  const [showHostTimer, setShowHostTimer] = useState(false); // [New] 방장 타이머 표시 여부 (전원)
  const [chatMessages, setChatMessages] = useState({});
  const [activeDropdown, setActiveDropdown] = useState(null); // 'chat' or 'rounds' or null

  // 초대 관련 상태
  const [inviteCode, setInviteCode] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // 강퇴 상태 (Kick States)
  const [kickTargetId, setKickTargetId] = useState(null);
  const [showKickConfirm, setShowKickConfirm] = useState(false);
  const [showKickedAlert, setShowKickedAlert] = useState(false);

  // 신고 상태 (UI 전용) (Report States)
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);
  const [reportTitle, setReportTitle] = useState('');
  const [reportReason, setReportReason] = useState('');

  // [New] 준비 상태 경고 모달
  const [showReadyWarning, setShowReadyWarning] = useState(false);
  const [readyWarningMessage, setReadyWarningMessage] = useState('준비 완료 상태에서는\n판수를 변경할 수 없습니다.');

  // [New] 드롭다운 닫기 타이머 Ref
  const closeTimeoutRef = useRef(null);

  const currentPlayer = players.find((player) => Number(player.memberId) === Number(myId));
  // 방장 여부 판별 로직 수정: 서버에서 주는 host 플래그가 정확하지 않을 수 있으므로, 인덱스 0번이거나 player.host 값 확인
  const isHost = currentPlayer?.isHost;
  const allReady = players.filter((player) => player.nickname).every((player) => player.isReady);

  // --- 기존 로직 유지 (Timer, Fetch, WebSocket) ---
  // (코드 길이상 핵심 로직은 그대로 두되 UI를 감싸는 형태로 구현)

  // 채팅 메시지 만료 관리
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setChatMessages((prev) => {
        const next = { ...prev };
        let changed = false;
        Object.keys(next).forEach((key) => {
          if (next[key].expireAt <= now) {
            delete next[key];
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 자동 시작 타이머
  useEffect(() => {
    if (!targetStartTime) {
      if (countDown !== null) setCountDown(null);
      if (hostCountDown !== null) setHostCountDown(null);
      setShowHostTimer(false); // [Fix] 자동시작 조건 깨지면 타이머 숨김
      return;
    }
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.ceil((targetStartTime - now) / 1000);

      if (diff <= 3 && diff > 0) {
        setCountDown(diff);
        setHostCountDown(null);
        setShowHostTimer(false);
      } else if (diff <= 8 && diff > 3) {
        if (isHost) setHostCountDown(diff - 3);
        setShowHostTimer(true); // 타이머 아이콘 활성화
        setCountDown(null);
      } else if (diff > 8) {
        setCountDown(null);
        setHostCountDown(null);
        setShowHostTimer(false);
      } else if (diff <= 0) {
        setCountDown(0);
        setHostCountDown(null);
        if (isHost && diff === 0) {
          stompClient.publish({ destination: '/app/games/start', body: JSON.stringify({ roomId: roomId }) });
        }
        clearInterval(interval);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [targetStartTime, isHost, stompClient, roomId]);

  // 방 정보
  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const response = await fetch(`/api/rooms/${roomId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!response.ok) {
          console.error('방 정보 조회 실패:', response.status);
          navigate('/roomlist');
          return;
        }
        const roomResponse = await response.json();
        setRoomTitle(roomResponse.title);
        setMaxPlayers(roomResponse.maxPlayers);
        setTotalRounds(roomResponse.totalRounds);
        setInviteCode(roomResponse.inviteCode || '');
        setLoading(false);
      } catch (error) {
        console.error('방 정보 조회 에러:', error);
        navigate('/roomlist');
      }
    };
    fetchRoom();
  }, [roomId, token, navigate]);

  // 웹소켓 (WebSocket)
  useEffect(() => {
    if (loading) return;
    const client = new Client({
      brokerURL: getBrokerURL(),
      connectHeaders: token ? { Authorization: `Bearer ${token}`, page: 'room' } : {},
      onConnect: () => {
        client.subscribe(`/topic/rooms/${roomId}`, (message) => {
          const data = JSON.parse(message.body);
          if (data.type === 'GAME_START') navigate(`/games/${roomId}`, { state: { initialGameData: data } });
          if (data.maxPlayers) setMaxPlayers(data.maxPlayers);
          if (data.totalRounds !== undefined) setTotalRounds(data.totalRounds); // 판수 업데이트
          if (data.players) {
            const updated = Array.from({ length: 4 }, (_, idx) => ({
              index: idx + 1,
              memberId: null,
              nickname: null,
              characterId: null,
              isReady: false,
              isHost: false,
            }));
            data.players.forEach((p, idx) => {
              // 백엔드에서 받은 index가 있으면 사용, 없으면 배열 순서 사용
              const slotIndex = (p.index ? p.index : idx + 1) - 1;
              if (slotIndex >= 0 && slotIndex < 4) {
                updated[slotIndex] = {
                  index: slotIndex + 1,
                  memberId: p.memberId,
                  nickname: p.nickname,
                  characterId: p.characterId,
                  isReady: p.ready || false,
                  isHost: p.host || false,
                };
              }
            });
            setPlayers(updated);
            setTargetStartTime(data.autoStartTime || null);
          }
          // 잠긴 슬롯 업데이트
          if (data.lockedSlots) {
            setLockedSlots(new Set(data.lockedSlots));
          }
          if (data.type === 'CHAT') {
            setChatMessages((prev) => ({
              ...prev,
              [data.memberId]: { text: data.message, expireAt: Date.now() + 3000 },
            }));
          }
          if (data.type === 'PLAYER_KICKED') {
            if (Number(data.memberId) === Number(getMyIdFromToken())) {
              sessionStorage.removeItem('joinedRoom');
              navigate('/room-list', { state: { kicked: true } });
            }
          }
        });
        client.publish({ destination: '/app/rooms/get-players', body: JSON.stringify({ roomId: roomId }) });
      },
    });
    client.activate();
    setStompClient(client);
    return () => client.deactivate();
  }, [roomId, loading]);

  // 액션 (Actions)
  const handleReady = () =>
    stompClient?.publish({ destination: '/app/rooms/ready', body: JSON.stringify({ roomId: roomId }) });
  const handleStartGame = () =>
    isHost &&
    allReady &&
    stompClient?.publish({ destination: '/app/rooms/start-timer', body: JSON.stringify({ roomId: roomId }) });
  const handleLeave = () => {
    leaveRoom(stompClient, roomId);
    sessionStorage.removeItem('joinedRoom');
    navigate('/room-list');
  };
  // 빈 슬롯 좌클릭 시 잠금 토글 (방장만)
  const handleSlotClick = (slotIndex) => {
    if (!isHost) return;
    // 1-based index로 변환
    const slot = slotIndex + 1;

    // 해당 슬롯에 플레이어가 있으면 잠금 불가
    const hasPlayer = players.find((p) => p.index === slot && p.nickname);
    if (hasPlayer) return;

    stompClient?.publish({
      destination: '/app/rooms/toggle-lock',
      body: JSON.stringify({ roomId: Number(roomId), slotIndex: slot }),
    });
  };
  // 라운드 변경 (10 -> 15 -> 20 -> 10)
  const handleRoundChange = () => {
    if (!isHost) return;
    const nextRounds = totalRounds === 10 ? 15 : totalRounds === 15 ? 20 : 10;
    stompClient?.publish({
      destination: '/app/rooms/update-settings',
      body: JSON.stringify({ roomId: Number(roomId), totalRounds: nextRounds }),
    });
    setTotalRounds(nextRounds); // 낙관적 UI 업데이트 (Optimistic UI update)
  };

  // 빈 자리 우클릭 시 자리 이동
  const handleMoveSeat = (targetIndex, isEmpty, islocked) => {
    // 빈 자리가 아니거나 잠긴 자리면 무시
    if (!isEmpty || islocked) return;
    // 준비 상태면 이동 불가
    if (currentPlayer?.isReady) return;

    stompClient?.publish({
      destination: '/app/rooms/move-seat',
      body: JSON.stringify({ roomId: Number(roomId), targetIndex }),
    });
  };

  const handleKick = (tid) => {
    setKickTargetId(tid);
    setShowKickConfirm(true);
  };
  const confirmKick = () => {
    stompClient?.publish({
      destination: '/app/rooms/kick',
      body: JSON.stringify({ roomId: roomId, memberId: kickTargetId }),
    });
    setShowKickConfirm(false);
    setKickTargetId(null);
  };
  // 신고 UI 액션 (Report UI Actions)
  const handleReport = (player) => {
    setReportTarget(player);
    setReportTitle('');
    setReportReason('');
    setShowReportModal(true);
  };
  const submitReport = async () => {
    if (!reportTitle.trim() || !reportReason.trim()) return;
    try {
      const token = sessionStorage.getItem('token');
      const formData = new FormData();
      formData.append('title', reportTitle);
      formData.append('content', `* 신고 유저 닉네임: ${reportTarget?.nickname}\n\n* 신고 사유:\n${reportReason}`);
      formData.append('category', 'USER_REPORT');
      await fetch('/api/member/inquiries', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      alert('신고가 접수되었습니다.');
    } catch (error) {
      console.error('신고 실패:', error);
      alert('신고 접수에 실패했습니다.');
    }
    setShowReportModal(false);
    setReportTarget(null);
  };
  const handleDelegate = (targetId) => {
    stompClient?.publish({
      destination: '/app/rooms/delegate-host',
      body: JSON.stringify({ roomId: roomId, memberId: targetId }),
    });
  };

  const sendChat = (text) => {
    stompClient?.publish({ destination: '/app/rooms/chat', body: JSON.stringify({ roomId: roomId, message: text }) });
    setActiveDropdown(null);
  };

  if (loading) return <div className="min-h-screen bg-gray-100 flex items-center justify-center">Loading...</div>;

  return (
    <AspectLayout>
      <div className="relative w-full h-full bg-cover bg-center flex flex-col items-center overflow-hidden font-gosanja bg-[url('/images/room-waiting/bg-room.jpg')]">
        {/* --- 오버레이 (강퇴, 카운트다운) --- */}
        {showKickConfirm && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
            <div className="bg-white rounded-[1.67cqw] p-[1.67cqw] text-center">
              <h3 className="text-[1.25cqw] font-black mb-[0.83cqw]">강퇴하시겠습니까?</h3>
              <div className="flex gap-[0.83cqw] justify-center">
                <button
                  onClick={() => setShowKickConfirm(false)}
                  className="px-[1.25cqw] py-[0.42cqw] bg-gray-200 rounded-full font-bold text-[0.83cqw]"
                >
                  취소
                </button>
                <button
                  onClick={confirmKick}
                  className="px-[1.25cqw] py-[0.42cqw] bg-red-500 text-white rounded-full font-bold text-[0.83cqw]"
                >
                  강퇴
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- 글로벌 게임 시작 카운트다운 오버레이 --- */}
        {countDown !== null && (
          <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
            <div className="bg-[#594E36]/90 px-[6cqw] py-[5cqw] rounded-[2.5cqw] shadow-2xl text-center">
              <p className="text-[#FFFEE0] text-[2.5cqw] font-black leading-relaxed">
                잠시후 자동으로
                <br />
                게임이 시작됩니다...
              </p>
            </div>
          </div>
        )}

        {/* --- 방장 시작 안내 오버레이 (자동 시작 타이머 활성화 시) --- */}
        {hostCountDown !== null && isHost && (
          <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
            <div className="bg-[#594E36]/90 px-[6cqw] py-[5cqw] rounded-[2.5cqw] shadow-2xl text-center">
              <p className="text-[#FFFEE0] text-[2.5cqw] font-black leading-relaxed">
                모든 플레이어가 기다리고 있어요
                <br />
                시작하기 버튼을 눌러주세요!
              </p>
            </div>
          </div>
        )}

        {/* --- 신고 모달 (UI 전용) --- */}
        {showReportModal && (
          <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center animate-fade-in">
            <div className="bg-white rounded-[1.67cqw] p-[1.67cqw] w-[26.04cqw] shadow-2xl flex flex-col items-center relative">
              {/* 헤더 */}
              <div className="flex flex-col items-center gap-[0.42cqw] mb-[1.25cqw]">
                <ExclamationTriangleIcon className="w-[2.5cqw] h-[2.5cqw] text-[#ff6b6b]" />
                <h3 className="text-[1.56cqw] font-black text-[#594E36]">신고하기</h3>
                <p className="text-gray-500 font-bold text-[0.83cqw]">
                  <span className="text-[#ff6b6b] text-[1.04cqw]">'{reportTarget?.nickname}'</span> 님을
                  신고하시겠습니까?
                </p>
              </div>

              {/* 제목 입력 */}
              <input
                className="w-full h-[3.13cqw] bg-[#F9F0EA] rounded-[0.63cqw] px-[0.83cqw] text-[#594E36] font-bold text-[0.94cqw] focus:outline-none focus:ring-2 focus:ring-[#E76C21] mb-[0.63cqw] placeholder-gray-400"
                placeholder="신고 제목"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                maxLength={25}
              />

              {/* 사유 입력 */}
              <textarea
                className="w-full h-[6.25cqw] bg-[#F9F0EA] rounded-[0.63cqw] p-[0.83cqw] text-[#594E36] font-bold text-[0.94cqw] resize-none focus:outline-none focus:ring-2 focus:ring-[#E76C21] mb-[1.25cqw] placeholder-gray-400"
                placeholder="신고 사유를 작성해주세요..."
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
              />

              {/* 버튼들 */}
              <div className="flex gap-[0.83cqw] w-full">
                <button
                  onClick={() => setShowReportModal(false)}
                  className="flex-1 py-[0.83cqw] bg-[#E0E0E0] rounded-[0.83cqw] text-[#8E8E8E] font-black text-[1.04cqw] hover:bg-[#D1D1D1] transition"
                >
                  취소
                </button>
                <button
                  onClick={submitReport}
                  className="flex-1 py-[0.83cqw] bg-[#ff6b6b] rounded-[0.83cqw] text-white font-black text-[1.04cqw] hover:bg-[#e65a5a] transition shadow-lg"
                >
                  전송하기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- 상단 헤더 (제목 + 라운드) --- */}
        <div className="w-full h-[6.25cqw] flex justify-center items-center relative z-10 pt-[5cqw] gap-[0.94cqw]">
          {/* 방 제목 보드 */}
          <div className="flex flex-col items-center">
            <div
              className="w-[36.04cqw] h-[5.21cqw] flex items-center px-[3cqw] gap-[1cqw] bg-center bg-no-repeat"
              style={{
                backgroundImage: "url('/images/room-waiting/ui-room-titlebox.webp')",
                backgroundSize: '100% 100%',
              }}
            >
              <span className="mb-[0.4cqw] text-[2.08cqw] font-black text-[#7B6C53] drop-shadow-sm pt-[0.2cqw] shrink-0">
                목적지 &gt;&gt;
              </span>
              <span className="mb-[0.4cqw] text-[2.08cqw] font-black text-[#594E36] drop-shadow-sm pt-[0.2cqw] overflow-hidden text-ellipsis whitespace-nowrap flex-1 text-center">
                {roomTitle}
              </span>
            </div>
          </div>

          {/* 라운드 배지 */}
          {totalRounds && (
            <div
              className="w-[5.21cqw] h-[5.21cqw] flex items-center justify-center bg-center bg-no-repeat"
              style={{
                backgroundImage: "url('/images/room-waiting/ui-room-dicebox.webp')",
                backgroundSize: 'contain',
              }}
            >
              <div
                className="mb-[0.4cqw] w-[6cqw] h-[6cqw] bg-[#7B6C53]"
                style={{
                  maskImage: `url(/images/room-waiting/icon-dice-${totalRounds}.png)`,
                  maskSize: 'contain',
                  maskRepeat: 'no-repeat',
                  maskPosition: 'center',
                  WebkitMaskImage: `url(/images/room-waiting/icon-dice-${totalRounds}.png)`,
                  WebkitMaskSize: 'contain',
                  WebkitMaskRepeat: 'no-repeat',
                  WebkitMaskPosition: 'center',
                }}
              />
            </div>
          )}
        </div>

        {/* --- 메인 콘텐츠 (플레이어 카드) --- */}
        <div className="flex-1 w-full max-w-[78.13cqw] flex items-start justify-center px-[0.83cqw] gap-[1.04cqw] pt-[6cqw]">
          {players.map((player) => {
            const isEmpty = !player.nickname;
            const islocked = lockedSlots.has(player.index); // 개별 슬롯 잠금 확인
            const isReady = player.isReady;
            const isMySlot = player.memberId === myId;
            const charImg = player.characterId ? CHARACTER_IMG_MAP[player.characterId] : null;

            return (
              <div key={player.index} className="flex flex-col items-center gap-[0.83cqw] relative">
                {/* 신고 드롭다운 */}
                {activeDropdown === `report-${player.index}` && (
                  <div className="absolute top-[-0.52cqw] z-[60] animate-fade-in-up">
                    <div className="bg-white border-[0.1cqw] border-[#EAD7B8] rounded-[0.63cqw] shadow-lg overflow-hidden">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReport(player);
                          setActiveDropdown(null);
                        }}
                        className="px-[0.83cqw] py-[0.42cqw] hover:bg-[#FFF0F0] text-[#ff6b6b] font-bold flex items-center gap-[0.42cqw] w-full whitespace-nowrap text-[0.83cqw]"
                      >
                        <ExclamationTriangleIcon className="w-[1.04cqw] h-[1.04cqw]" />
                        신고하기
                      </button>
                    </div>
                  </div>
                )}
                {/* 카드 Area */}
                <div
                  onClick={() => {
                    if (!isMySlot && isEmpty) {
                      handleSlotClick(player.index - 1);
                    }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (!isMySlot && isEmpty) {
                      handleMoveSeat(player.index - 1, isEmpty, islocked);
                    }
                  }}
                  className={`
                     relative w-[17.5cqw] h-[23.96cqw] rounded-[1.88cqw] transition-all duration-300 overflow-visible
                     ${
                       isEmpty
                         ? islocked
                           ? isHost
                             ? 'cursor-pointer hover:opacity-90'
                             : 'cursor-default'
                           : 'cursor-pointer hover:scale-105'
                         : 'cursor-pointer'
                     }
                   `}
                >
                  {/* 1. 플레이어 존재 */}
                  {player.nickname && (
                    <div className="w-full h-full relative">
                      <img
                        src={
                          isMySlot
                            ? '/images/room-waiting/ui-room-playercard-me.webp'
                            : '/images/room-waiting/ui-room-playercard-other.webp'
                        }
                        alt="background"
                        className="absolute inset-0 w-full h-full object-cover"
                      />

                      <div className="absolute inset-0 z-10 flex flex-col items-center p-[0.83cqw]">
                        {/* 인덱스 */}
                        <div className="absolute top-[1.2cqw] left-[1.1cqw] min-w-[2cqw] h-[2cqw] flex items-center justify-center text-white font-black text-[1.25cqw] z-20">
                          {player.index}
                        </div>

                        {/* 이름 */}
                        <div className="relative flex justify-center items-center mb-[0.42cqw] mt-[0.3cqw] w-full z-50">
                          <div
                            className={`text-[1.8cqw] font-black text-[#594E36] relative ${!isMySlot ? 'cursor-pointer' : ''}`}
                            onClick={(e) => {
                              if (!isMySlot) {
                                e.stopPropagation();
                                setActiveDropdown(
                                  activeDropdown === `report-${player.index}` ? null : `report-${player.index}`,
                                );
                              }
                            }}
                          >
                            {player.nickname}
                            {player.isHost && (
                              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-[0.42cqw] bg-[#896339] text-white text-[0.83cqw] font-bold px-[0.63cqw] py-[0.31cqw] rounded-full shadow-sm whitespace-nowrap">
                                방장
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 캐릭터 */}
                        <div className="flex-1 w-full relative flex items-center justify-center mb-[-1.04cqw] z-10 -mt-[2.5cqw]">
                          {charImg ? (
                            <img src={charImg} alt="char" className="h-[13.54cqw] object-contain drop-shadow-md" />
                          ) : (
                            <div className="text-[2.08cqw] opacity-20">?</div>
                          )}
                        </div>

                        {/* 준비 상태 */}
                        <div className="w-full flex justify-center mb-[0.9cqw] z-20 translate-y-[0.63cqw]">
                          {isReady ? (
                            <div className="w-[60%] py-[0.42cqw] rounded-[0.83cqw] bg-[#57B47C] text-white font-black text-[1.25cqw] text-center shadow-md">
                              ✔ 준비완료
                            </div>
                          ) : (
                            <div className="w-[60%] py-[0.42cqw] rounded-[0.83cqw] bg-[#EB5757] text-white font-black text-[1.25cqw] text-center shadow-md">
                              준비중
                            </div>
                          )}
                        </div>

                        {/* 말풍선 - 캐릭터 머리 위 */}
                        {chatMessages[player.memberId] && (
                          <div className="absolute top-[2cqw] left-1/2 -translate-x-1/2 z-[60] bg-[#FFFEE0] px-[1cqw] py-[0.5cqw] rounded-[0.83cqw] shadow-lg border-[0.1cqw] border-[#EAD7B8] whitespace-nowrap animate-gentle-bounce">
                            <span className="font-bold text-[#7B6C53] text-[1.2cqw]">
                              {chatMessages[player.memberId].text}
                            </span>
                            <div className="absolute -bottom-[0.42cqw] left-1/2 -translate-x-1/2 w-[0.83cqw] h-[0.83cqw] bg-[#FFFEE0] border-b-[0.1cqw] border-r-[0.1cqw] border-[#EAD7B8] transform rotate-45"></div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 2. 빈 슬롯 */}
                  {isEmpty && !islocked && (
                    <div className="w-full h-full relative">
                      <img
                        src="/images/room-waiting/ui-room-playercard-wait.webp"
                        alt="waiting"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
                        <div className="absolute top-[1.2cqw] left-[1.1cqw] min-w-[1.67cqw] h-[1.67cqw] flex items-center justify-center text-white font-black text-[0.94cqw] opacity-50 z-20">
                          {player.index}
                        </div>
                        <span
                          className="text-[2.08cqw] font-black text-white tracking-widest relative z-30"
                          style={{
                            WebkitTextStroke: '0.42cqw #C4A485',
                            paintOrder: 'stroke fill',
                          }}
                        >
                          대기중
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 3. 잠긴 슬롯 */}
                  {islocked && (
                    <div className="w-full h-full relative">
                      <img
                        src="/images/room-waiting/ui-room-playercard-lock.webp"
                        alt="locked"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>

                {/* 방장 시계 아이콘 (모든 플레이어에게 표시) */}
                {player.isHost && showHostTimer && (
                  <img
                    src="/images/room-waiting/icon-timer.png"
                    alt="timer"
                    className="absolute top-[13.2cqw] right-[-1.2cqw] w-[8cqw] h-[8cqw] object-contain animate-wiggle z-30 drop-shadow-lg"
                  />
                )}

                {/* 방장 컨트롤 */}
                {!isMySlot && isHost && player.nickname && countDown === null && (
                  <div className="absolute top-full mt-[0.83cqw] h-[4.17cqw] flex gap-[0.63cqw] animate-slide-in-up z-50">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleKick(player.memberId);
                      }}
                      className="w-[4.17cqw] h-[4.17cqw] bg-[#FFFEE0] rounded-[1.25cqw] shadow-lg flex items-center justify-center hover:scale-105 transition hover:bg-[#FFF0F0]"
                      title="강퇴하기"
                    >
                      <div
                        className="w-[2.5cqw] h-[2.5cqw] bg-[#7B6C53]"
                        style={{
                          maskImage: "url('/images/room-waiting/icon-x.svg')",
                          maskSize: 'contain',
                          maskRepeat: 'no-repeat',
                          maskPosition: 'center',
                          WebkitMaskImage: "url('/images/room-waiting/icon-x.svg')",
                          WebkitMaskSize: 'contain',
                          WebkitMaskRepeat: 'no-repeat',
                          WebkitMaskPosition: 'center',
                        }}
                      />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelegate(player.memberId);
                      }}
                      className="w-[4.17cqw] h-[4.17cqw] bg-[#FFFEE0] rounded-[1.25cqw] shadow-lg flex items-center justify-center hover:scale-105 transition text-[#7B6C53]"
                      title="방장 위임"
                    >
                      <StarIcon className="w-[2.08cqw] h-[2.08cqw]" />
                    </button>
                  </div>
                )}

                {/* 내 컨트롤 */}
                {isMySlot && countDown === null && (
                  <div className="absolute top-full mt-[0.83cqw] h-[4.17cqw] flex gap-[0.63cqw] animate-slide-in-up z-50">
                    {/* 채팅 */}
                    <div className="relative">
                      <button
                        onClick={() => setActiveDropdown(activeDropdown === 'chat' ? null : 'chat')}
                        className="w-[4.17cqw] h-[4.17cqw] bg-[#FFFEE0] rounded-[1.25cqw] shadow-lg flex items-center justify-center hover:scale-105 transition"
                      >
                        <ChatBubbleLeftEllipsisIcon className="w-[3cqw] h-[3cqw] text-[#7B6C53]" />
                      </button>
                      {activeDropdown === 'chat' && (
                        <div className="absolute right-[3.13cqw] bottom-0 bg-[#FFFEE0] rounded-[0.83cqw] shadow-xl p-[0.63cqw] flex flex-col gap-[0.42cqw] min-w-[7.81cqw] border-[0.1cqw] border-[#EAD7B8] animate-fade-in-up z-50">
                          {['레디레디', '시작해~!', '화이팅', '잠시만요', '빨리빨리', '안녕하세요'].map((msg) => (
                            <button
                              key={msg}
                              onClick={() => sendChat(msg)}
                              className="text-left px-[0.63cqw] py-[0.42cqw] hover:bg-[#F5EED0] rounded-[0.42cqw] font-bold text-[#7B6C53] whitespace-nowrap text-[0.83cqw]"
                            >
                              {msg}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 다시 선택 */}
                    <button
                      onClick={() => {
                        if (player.isReady) {
                          setReadyWarningMessage('준비 완료 상태에서는\n캐릭터를 변경할 수 없습니다.');
                          setShowReadyWarning(true);
                        } else {
                          navigate(`/rooms/${roomId}/select`);
                        }
                      }}
                      className="w-[4.17cqw] h-[4.17cqw] bg-[#FFFEE0] rounded-[1.25cqw] shadow-lg flex items-center justify-center hover:scale-105 transition"
                    >
                      <div
                        className="w-[3cqw] h-[3cqw] bg-[#7B6C53]"
                        style={{
                          maskImage: "url('/images/room-waiting/icon-choose.svg')",
                          maskSize: 'contain',
                          maskRepeat: 'no-repeat',
                          maskPosition: 'center',
                          WebkitMaskImage: "url('/images/room-waiting/icon-choose.svg')",
                          WebkitMaskSize: 'contain',
                          WebkitMaskRepeat: 'no-repeat',
                          WebkitMaskPosition: 'center',
                        }}
                      />
                    </button>

                    {/* 라운드 선택 */}
                    {isHost && totalRounds && (
                      <div
                        className="relative"
                        onMouseLeave={() => {
                          // 드롭다운 영역을 벗어나면 닫기 (300ms 지연)
                          closeTimeoutRef.current = setTimeout(() => {
                            if (activeDropdown === 'rounds') setActiveDropdown(null);
                          }, 1000);
                        }}
                        onMouseEnter={() => {
                          // 다시 들어오면 닫기 취소
                          if (closeTimeoutRef.current) {
                            clearTimeout(closeTimeoutRef.current);
                            closeTimeoutRef.current = null;
                          }
                        }}
                      >
                        <button
                          onClick={() => {
                            if (currentPlayer?.isReady) {
                              setReadyWarningMessage('준비 완료 상태에서는\n판수를 변경할 수 없습니다.');
                              setShowReadyWarning(true);
                            } else {
                              setActiveDropdown(activeDropdown === 'rounds' ? null : 'rounds');
                            }
                          }}
                          className="w-[4.17cqw] h-[4.17cqw] bg-[#FFFEE0] rounded-[1.25cqw] shadow-lg flex items-center justify-center hover:scale-105 transition relative"
                        >
                          <div
                            className="w-[6cqw] h-[6cqw] bg-[#7B6C53]"
                            style={{
                              maskImage: `url(/images/room-waiting/icon-dice-${totalRounds}.png)`,
                              maskSize: '100%',
                              maskRepeat: 'no-repeat',
                              maskPosition: 'center',
                              WebkitMaskImage: `url(/images/room-waiting/icon-dice-${totalRounds}.png)`,
                              WebkitMaskSize: '100%',
                              WebkitMaskRepeat: 'no-repeat',
                              WebkitMaskPosition: 'center',
                            }}
                          />
                        </button>
                        {activeDropdown === 'rounds' && (
                          <div className="absolute top-[4.69cqw] left-1/2 -translate-x-1/2 bg-[#FDFBF6] rounded-[1.04cqw] shadow-xl border-[0.21cqw] border-[#EAD7B8] px-[0.83cqw] py-[0.42cqw] flex items-center gap-[0.63cqw] z-50 min-w-[7.29cqw] justify-between">
                            <button
                              onClick={() => {
                                const next = Math.max(10, totalRounds - 10);
                                if (next !== totalRounds) {
                                  stompClient?.publish({
                                    destination: '/app/rooms/update-settings',
                                    body: JSON.stringify({ roomId: Number(roomId), totalRounds: next }),
                                  });
                                  setTotalRounds(next);
                                }
                              }}
                              className="text-[#EAD7B8] hover:text-[#594E36] font-black text-[1.25cqw]"
                            >
                              -
                            </button>
                            <span className="text-[#594E36] font-black text-[1.04cqw] whitespace-nowrap">
                              {totalRounds}판
                            </span>
                            <button
                              onClick={() => {
                                const next = Math.min(40, totalRounds + 10);
                                if (next !== totalRounds) {
                                  stompClient?.publish({
                                    destination: '/app/rooms/update-settings',
                                    body: JSON.stringify({ roomId: Number(roomId), totalRounds: next }),
                                  });
                                  setTotalRounds(next);
                                }
                              }}
                              className="text-[#EAD7B8] hover:text-[#594E36] font-black text-[1.25cqw]"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* --- 하단 컨트롤 --- */}
        <div className="absolute bottom-[6cqw] left-1/2 -translate-x-1/2 z-10">
          <div className="flex gap-[2cqw] items-center">
            <button
              onClick={() => setShowInviteModal(true)}
              className="bg-[#78D7B2] w-[15cqw] py-[1cqw] rounded-[1.2cqw] shadow-lg hover:scale-105 transition flex items-center justify-center gap-[0.8cqw]"
            >
              <img
                src="/images/room-waiting/icon-mail.svg"
                alt="invite"
                className="w-[2.8cqw] h-[2.8cqw] object-contain brightness-0 invert"
              />
              <span className="text-white text-[2cqw] font-black">초대하기</span>
            </button>

            <button
              onClick={handleReady}
              disabled={!currentPlayer?.characterId}
              className={`w-[15cqw] py-[1cqw] rounded-[1.2cqw] shadow-lg transition flex items-center justify-center
                    ${!currentPlayer?.characterId ? 'bg-gray-400 cursor-not-allowed opacity-60' : currentPlayer?.isReady ? 'bg-[#57B47C] hover:scale-105' : 'bg-[#EB5757] hover:scale-105'}
                  `}
            >
              <span className="text-white text-[2cqw] font-black">
                {currentPlayer?.isReady ? '준비 완료' : '준비하기'}
              </span>
            </button>

            {isHost && allReady && (
              <button
                onClick={handleStartGame}
                className="bg-[#4A90E2] w-[15cqw] py-[1cqw] rounded-[1.2cqw] shadow-lg hover:scale-105 transition flex items-center justify-center"
              >
                <span className="text-white text-[2cqw] font-black">게임 시작</span>
              </button>
            )}
          </div>
        </div>

        {/* --- 나가기 버튼 (우측 하단 고정) --- */}
        <div className="absolute right-[2.08cqw] bottom-[2cqw] z-10">
          <ExitButton onClick={handleLeave} />
        </div>

        {isHost && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            {/* 필요 시 중앙 십자선 또는 장식 */}
          </div>
        )}

        {/* 준비 상태 경고 모달 */}
        {showReadyWarning && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 animate-fade-in">
            <div className="bg-white rounded-[1.04cqw] p-[1.67cqw] shadow-xl flex flex-col items-center gap-[1.25cqw] min-w-[20cqw] animate-scale-up">
              <div className="flex flex-col items-center gap-[0.42cqw]">
                <ExclamationTriangleIcon className="w-[3.13cqw] h-[3.13cqw] text-[#EB5757]" />
                <span className="text-[#594E36] font-bold text-[1.25cqw] text-center whitespace-pre-line">
                  {readyWarningMessage}
                </span>
              </div>
              <button
                onClick={() => setShowReadyWarning(false)}
                className="bg-[#594E36] text-white px-[2.08cqw] py-[0.63cqw] rounded-[0.63cqw] font-bold text-[1.04cqw] hover:bg-[#453C2A] hover:scale-105 transition shadow-md"
              >
                확인
              </button>
            </div>
          </div>
        )}

        {/* 초대 모달 */}
        {showInviteModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 animate-fade-in">
            <div className="bg-white rounded-[1.04cqw] p-[2.08cqw] shadow-xl flex flex-col items-center gap-[1.67cqw] min-w-[25cqw] animate-scale-up">
              <div className="text-[#594E36] font-bold text-[1.46cqw]">친구 초대하기</div>

              {/* 초대 코드 */}
              <div className="w-full flex flex-col gap-[0.42cqw]">
                <span className="text-[#7C7158] text-[0.94cqw]">초대 코드</span>
                <div className="flex items-center gap-[0.63cqw]">
                  <div className="flex-1 bg-[#F5F1E8] rounded-[0.63cqw] px-[1.04cqw] py-[0.63cqw] font-mono font-bold text-[1.25cqw] text-[#594E36] text-center tracking-widest">
                    {inviteCode}
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(inviteCode);
                      setCopySuccess(true);
                      setTimeout(() => setCopySuccess(false), 2000);
                    }}
                    className="bg-[#594E36] text-white px-[1.04cqw] py-[0.63cqw] rounded-[0.63cqw] font-bold text-[0.94cqw] hover:bg-[#453C2A] transition"
                  >
                    복사
                  </button>
                </div>
              </div>

              {/* 복사 완료 메시지 */}
              {copySuccess && (
                <span className="text-[#78D7B2] font-bold text-[0.94cqw] animate-fade-in">✓ 복사 완료!</span>
              )}

              <button
                onClick={() => setShowInviteModal(false)}
                className="bg-[#E0DED9] text-[#594E36] px-[2.5cqw] py-[0.63cqw] rounded-[0.63cqw] font-bold text-[1.04cqw] hover:bg-[#D0CEC9] transition"
              >
                닫기
              </button>
            </div>
          </div>
        )}
      </div>
    </AspectLayout>
  );
}

export default Room;
