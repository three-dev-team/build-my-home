import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import { leaveRoom } from '../../utils/roomUtils.js';
import { getBrokerURL } from '../../utils/ws.js';
import { getMyIdFromToken } from '../../utils/auth.js';
import { CHARACTERS } from '../../constants/characters.js';
import { COLORS } from '../../constants/colors.js';
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
  const [totalRounds, setTotalRounds] = useState(10);
  const [stompClient, setStompClient] = useState(null);

  // 상태 (States)
  const [targetStartTime, setTargetStartTime] = useState(null);
  const [countDown, setCountDown] = useState(null);
  const [hostCountDown, setHostCountDown] = useState(null);
  const [showHostTimer, setShowHostTimer] = useState(false); // [New] 방장 타이머 표시 여부 (전원)
  const [chatMessages, setChatMessages] = useState({});
  const [activeDropdown, setActiveDropdown] = useState(null); // 'chat' or 'rounds' or null

  // 강퇴 상태 (Kick States)
  const [kickTargetId, setKickTargetId] = useState(null);
  const [showKickConfirm, setShowKickConfirm] = useState(false);
  const [showKickedAlert, setShowKickedAlert] = useState(false);

  // 신고 상태 (UI 전용) (Report States)
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);
  const [reportReason, setReportReason] = useState('');

  const currentPlayer = players.find((player) => player.memberId === myId);
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
      const response = await fetch(`/api/rooms/${roomId}`);
      const roomResponse = await response.json();
      setRoomTitle(roomResponse.title);
      setMaxPlayers(roomResponse.maxPlayers);
      setTotalRounds(roomResponse.totalRounds);
      setLoading(false);
    };
    fetchRoom();
  }, [roomId]);

  // 웹소켓 (WebSocket)
  useEffect(() => {
    if (loading) return;
    const client = new Client({
      brokerURL: getBrokerURL(),
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      onConnect: () => {
        client.subscribe(`/topic/rooms/${roomId}`, (message) => {
          const data = JSON.parse(message.body);
          if (data.type === 'GAME_START') navigate(`/games/${roomId}`, { state: { initialGameData: data } });
          if (data.maxPlayers) setMaxPlayers(data.maxPlayers);
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
              if (idx < 4) {
                updated[idx] = {
                  index: idx + 1,
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
          if (data.type === 'CHAT') {
            setChatMessages((prev) => ({
              ...prev,
              [data.memberId]: { text: data.message, expireAt: Date.now() + 3000 },
            }));
          }
          if (data.type === 'PLAYER_KICKED') {
            if (Number(data.memberId) === Number(getMyIdFromToken())) setShowKickedAlert(true);
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
    navigate('/room-list');
  };
  const handleSlotClick = (index, isEmpty) => {
    if (!isHost) return;
    const currentCount = players.filter((p) => p.nickname).length;
    let newMax = maxPlayers;
    if (index >= maxPlayers) newMax = index + 1;
    else if (isEmpty) {
      if (currentCount > index) {
        if (index < 2) return;
        newMax = index;
      } // 잠금 (기존 인원 강퇴 방지?)
      else {
        if (index < 2) return;
        newMax = index;
      }
    } else return;

    if (newMax !== maxPlayers)
      stompClient?.publish({
        destination: '/app/rooms/update-settings',
        body: JSON.stringify({ roomId: Number(roomId), maxPlayers: newMax }),
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
    setReportReason('');
    setShowReportModal(true);
  };
  const submitReport = () => {
    // 실제 서버 전송 로직은 없음 (UI Only)
    console.log(`Reported ${reportTarget?.nickname}: ${reportReason}`);
    alert('신고가 접수되었습니다.');
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
            <div className="bg-white rounded-[1.67cqw] p-[1.67cqw] border-[0.21cqw] border-[#ff6b6b] text-center">
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
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center animate-fade-in">
            <div className="flex flex-col items-center justify-center">
              {countDown > 0 ? (
                <div className="text-white text-[7.81cqw] font-black drop-shadow-[0_0.52cqw_0.52cqw_rgba(0,0,0,0.5)] animate-bounce">
                  {countDown}
                </div>
              ) : (
                <div className="text-white text-[5.21cqw] font-black drop-shadow-[0_0.52cqw_0.52cqw_rgba(0,0,0,0.5)] animate-ping">
                  GO!
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- 신고 모달 (UI 전용) --- */}
        {showReportModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center animate-fade-in">
            <div className="bg-white rounded-[1.67cqw] p-[1.67cqw] w-[26.04cqw] border-[0.21cqw] border-[#ff6b6b] shadow-2xl flex flex-col items-center relative">
              {/* 헤더 */}
              <div className="flex flex-col items-center gap-[0.42cqw] mb-[1.25cqw]">
                <ExclamationTriangleIcon className="w-[2.5cqw] h-[2.5cqw] text-[#ff6b6b]" />
                <h3 className="text-[1.56cqw] font-black text-[#594E36]">신고하기</h3>
                <p className="text-gray-500 font-bold text-[0.83cqw]">
                  <span className="text-[#ff6b6b] text-[1.04cqw]">'{reportTarget?.nickname}'</span> 님을
                  신고하시겠습니까?
                </p>
              </div>

              {/* 텍스트 입력 */}
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
        <div className="w-full h-[6.25cqw] flex justify-center items-center relative z-10 pt-[2.5cqw] gap-[0.94cqw]">
          {/* 방 제목 보드 */}
          <div className="flex flex-col items-center">
            <div
              className="w-[36.04cqw] h-[5.21cqw] flex items-center justify-center gap-[1.88cqw] bg-center bg-no-repeat"
              style={{
                backgroundImage: "url('/images/room-waiting/ui-room-titlebox.webp')",
                backgroundSize: '100% 100%',
              }}
            >
              <span className="text-[2.08cqw] font-black text-[#594E36] drop-shadow-sm pt-[0.42cqw]">
                목적지 &gt;&gt;
              </span>
              <span className="text-[2.08cqw] font-black text-[#594E36] drop-shadow-sm pt-[0.42cqw] overflow-hidden text-ellipsis whitespace-nowrap max-w-[19.79cqw]">
                {roomTitle}
              </span>
            </div>

            {/* Host Auto-Start Countdown */}
            {hostCountDown !== null && isHost && (
              <div className="absolute top-full mt-[0.42cqw] bg-black/70 px-[1.25cqw] py-[0.42cqw] rounded-[0.63cqw] backdrop-blur-sm border-[0.1cqw] border-[#ff6b6b] flex items-center gap-[0.63cqw] animate-bounce z-50">
                <span className="text-white font-bold text-[0.94cqw] whitespace-nowrap">자동 시작까지</span>
                <span className="text-[#ff6b6b] text-[1.56cqw] font-black">{hostCountDown}</span>
              </div>
            )}
          </div>

          {/* 라운드 배지 */}
          <div
            className="w-[5.21cqw] h-[5.21cqw] flex items-center justify-center bg-center bg-no-repeat"
            style={{
              backgroundImage: "url('/images/room-waiting/ui-room-dicebox.webp')",
              backgroundSize: 'contain',
            }}
          >
            <div
              className="w-[3.33cqw] h-[3.33cqw] bg-[#594E36]"
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
        </div>

        {/* --- 메인 콘텐츠 (플레이어 카드) --- */}
        <div className="flex-1 w-full max-w-[78.13cqw] flex items-center justify-center px-[0.83cqw] gap-[1.04cqw]">
          {players.map((player) => {
            const isEmpty = !player.nickname;
            const islocked = player.index - 1 >= maxPlayers;
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
                  onClick={() => handleSlotClick(player.index - 1, isEmpty)}
                  className={`
                     relative w-[17.5cqw] h-[23.96cqw] rounded-[1.88cqw] transition-all duration-300 overflow-hidden
                     ${
                       isEmpty
                         ? islocked
                           ? 'cursor-pointer hover:opacity-90'
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
                        <div className="absolute top-[0.83cqw] left-[0.83cqw] min-w-[1.67cqw] h-[1.67cqw] flex items-center justify-center text-white font-black text-[0.94cqw] z-20">
                          {player.index}
                        </div>

                        {/* 이름 */}
                        <div className="relative flex justify-center items-center mb-[0.42cqw] mt-[0.83cqw] w-full z-50">
                          <div
                            className={`text-[1.56cqw] font-black text-[#594E36] relative ${!isMySlot ? 'cursor-pointer' : ''}`}
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
                              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-[0.42cqw] bg-[#896339] text-white text-[0.63cqw] font-bold px-[0.42cqw] py-[0.21cqw] rounded-full shadow-sm whitespace-nowrap">
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
                          {/* 타이머 */}
                          {player.isHost && showHostTimer && (
                            <img
                              src="/images/room-waiting/icon-timer.png"
                              alt="timer"
                              className="absolute bottom-[1.04cqw] right-[2.08cqw] w-[2.92cqw] h-[2.92cqw] object-contain animate-wiggle z-50 drop-shadow-lg"
                            />
                          )}
                        </div>

                        {/* 준비 상태 */}
                        <div className="w-full flex justify-center mb-[0.42cqw] z-20 translate-y-[0.63cqw]">
                          {isReady ? (
                            <div className="w-[80%] py-[0.63cqw] rounded-full bg-[#78D7B2] text-white font-black text-[1.04cqw] text-center shadow-md">
                              ✔ 준비완료
                            </div>
                          ) : (
                            <div className="w-[80%] py-[0.63cqw] rounded-full bg-[#EB5757] text-white font-black text-[1.04cqw] text-center shadow-md">
                              준비중
                            </div>
                          )}
                        </div>

                        {/* 말풍선 */}
                        {chatMessages[player.memberId] && (
                          <div className="absolute top-[4.17cqw] z-40 bg-white px-[0.83cqw] py-[0.42cqw] rounded-[0.63cqw] shadow-lg border-[0.1cqw] border-[#EAD7B8] animate-bounce whitespace-nowrap">
                            <span className="font-bold text-[#594E36] text-[0.83cqw]">
                              {chatMessages[player.memberId].text}
                            </span>
                            <div className="absolute -bottom-[0.42cqw] left-1/2 -translate-x-1/2 w-[0.83cqw] h-[0.83cqw] bg-white border-b-[0.1cqw] border-r-[0.1cqw] border-[#EAD7B8] transform rotate-45"></div>
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
                        <div className="absolute top-[0.83cqw] left-[0.83cqw] min-w-[1.67cqw] h-[1.67cqw] flex items-center justify-center text-white font-black text-[0.94cqw] opacity-50 z-20">
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

                {/* 방장 컨트롤 */}
                {!isMySlot && isHost && player.nickname && countDown === null && (
                  <div className="absolute top-full mt-[0.83cqw] h-[4.17cqw] flex gap-[0.63cqw] animate-slide-in-up z-50">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleKick(player.memberId);
                      }}
                      className="w-[4.17cqw] h-[4.17cqw] bg-white rounded-[1.25cqw] shadow-lg flex items-center justify-center hover:scale-105 transition hover:bg-[#FFF0F0]"
                      title="강퇴하기"
                    >
                      <img
                        src="/images/room-waiting/icon-x.svg"
                        alt="kick"
                        className="w-[2.08cqw] h-[2.08cqw] object-contain"
                      />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelegate(player.memberId);
                      }}
                      className="w-[4.17cqw] h-[4.17cqw] bg-white rounded-[1.25cqw] shadow-lg flex items-center justify-center hover:scale-105 transition text-[#594E36]"
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
                        className="w-[4.17cqw] h-[4.17cqw] bg-white rounded-[1.25cqw] shadow-lg flex items-center justify-center hover:scale-105 transition"
                      >
                        <ChatBubbleLeftEllipsisIcon className="w-[1.67cqw] h-[1.67cqw] text-[#594E36]" />
                      </button>
                      {activeDropdown === 'chat' && (
                        <div className="absolute bottom-[4.69cqw] left-1/2 -translate-x-1/2 bg-white rounded-[0.83cqw] shadow-xl p-[0.63cqw] flex flex-col gap-[0.42cqw] min-w-[7.81cqw] border-[0.1cqw] border-[#EAD7B8] animate-fade-in-up z-50">
                          {['레디레디', '시작해~!', '화이팅'].map((msg) => (
                            <button
                              key={msg}
                              onClick={() => sendChat(msg)}
                              className="text-left px-[0.63cqw] py-[0.42cqw] hover:bg-[#FFF8EA] rounded-[0.42cqw] font-bold text-[#594E36] whitespace-nowrap text-[0.83cqw]"
                            >
                              {msg}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 다시 선택 */}
                    <button
                      onClick={() => navigate(`/rooms/${roomId}/select`)}
                      className="w-[4.17cqw] h-[4.17cqw] bg-white rounded-[1.25cqw] shadow-lg flex items-center justify-center hover:scale-105 transition"
                    >
                      <img
                        src="/images/room-waiting/icon-choose.svg"
                        alt="re-select"
                        className="w-[4.17cqw] h-[4.17cqw] object-contain p-[0.83cqw]"
                      />
                    </button>

                    {/* 라운드 선택 */}
                    {isHost && (
                      <div className="relative">
                        <button
                          onClick={() => setActiveDropdown(activeDropdown === 'rounds' ? null : 'rounds')}
                          className="w-[4.17cqw] h-[4.17cqw] bg-white rounded-[1.25cqw] shadow-lg flex items-center justify-center hover:scale-105 transition relative"
                        >
                          <div
                            className="w-[3.33cqw] h-[3.33cqw] bg-[#594E36]"
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
                        </button>
                        {activeDropdown === 'rounds' && (
                          <div className="absolute top-[4.69cqw] left-1/2 -translate-x-1/2 bg-white rounded-[1.04cqw] shadow-xl border-[0.21cqw] border-[#EAD7B8] px-[0.83cqw] py-[0.42cqw] flex items-center gap-[0.63cqw] z-50 min-w-[7.29cqw] justify-between">
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
        <div className="w-full h-[7.29cqw] px-[2.08cqw] pb-[1.67cqw] flex items-end justify-center relative z-10">
          <div className="flex gap-[0.83cqw] items-end mb-[0.42cqw]">
            <button className="bg-[#78D7B2] w-[13.54cqw] h-[4.17cqw] rounded-[2.08cqw] shadow-lg hover:scale-105 transition flex items-center justify-center gap-[0.63cqw]">
              <span className="text-white text-[2.08cqw] font-black tracking-widest leading-none pb-[0.21cqw]">✉</span>
              <span className="text-white text-[1.56cqw] font-black">초대하기</span>
            </button>

            <button
              onClick={handleReady}
              className={`w-[13.54cqw] h-[4.17cqw] rounded-[2.08cqw] shadow-lg hover:scale-105 transition flex items-center justify-center
                    ${currentPlayer?.isReady ? 'bg-[#78D7B2]' : 'bg-[#EB5757]'}
                  `}
            >
              <span className="text-white text-[1.56cqw] font-black">
                {currentPlayer?.isReady ? '준비 완료' : '준비하기'}
              </span>
            </button>

            {isHost && allReady && (
              <button
                onClick={handleStartGame}
                className="bg-[#4A90E2] w-[13.54cqw] h-[4.17cqw] rounded-[2.08cqw] shadow-lg hover:scale-105 transition flex items-center justify-center animate-pulse"
              >
                <span className="text-white text-[1.56cqw] font-black">게임 시작</span>
              </button>
            )}
          </div>

          <div className="absolute right-[2.08cqw] bottom-[1.67cqw]">
            <ExitButton onClick={handleLeave} />
          </div>
        </div>

        {isHost && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            {/* 필요 시 중앙 십자선 또는 장식 */}
          </div>
        )}
      </div>
    </AspectLayout>
  );
}

export default Room;
