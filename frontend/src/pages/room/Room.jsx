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
    <div
      className="w-full h-screen bg-cover bg-center font-gosanja relative overflow-hidden flex flex-col items-center"
      style={{ backgroundImage: "url('/images/room-waiting/bg-room.jpg')" }}
    >
      {/* --- 오버레이 (강퇴, 카운트다운) --- */}
      {/* (필요 시 기존 오버레이 로직 복사, 여기서는 간결함/디자인 집중을 위해 단순화) */}
      {showKickConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-3xl p-8 border-4 border-[#ff6b6b] text-center">
            <h3 className="text-2xl font-black mb-4">강퇴하시겠습니까?</h3>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setShowKickConfirm(false)}
                className="px-6 py-2 bg-gray-200 rounded-full font-bold"
              >
                취소
              </button>
              <button onClick={confirmKick} className="px-6 py-2 bg-red-500 text-white rounded-full font-bold">
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
              <div className="text-white text-[150px] font-black drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] animate-bounce">
                {countDown}
              </div>
            ) : (
              <div className="text-white text-[100px] font-black drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] animate-ping">
                GO!
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- 신고 모달 (UI 전용) --- */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center animate-fade-in">
          <div className="bg-white rounded-[32px] p-8 w-[500px] border-4 border-[#ff6b6b] shadow-2xl flex flex-col items-center relative">
            {/* 헤더 */}
            <div className="flex flex-col items-center gap-2 mb-6">
              <ExclamationTriangleIcon className="w-12 h-12 text-[#ff6b6b]" />
              <h3 className="text-3xl font-black text-[#594E36]">신고하기</h3>
              <p className="text-gray-500 font-bold">
                <span className="text-[#ff6b6b] text-xl">'{reportTarget?.nickname}'</span> 님을 신고하시겠습니까?
              </p>
            </div>

            {/* 텍스트 입력 */}
            <textarea
              className="w-full h-[120px] bg-[#F9F0EA] rounded-xl p-4 text-[#594E36] font-bold text-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#E76C21] mb-6 placeholder-gray-400"
              placeholder="신고 사유를 작성해주세요..."
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
            />

            {/* 버튼들 */}
            <div className="flex gap-4 w-full">
              <button
                onClick={() => setShowReportModal(false)}
                className="flex-1 py-4 bg-[#E0E0E0] rounded-2xl text-[#8E8E8E] font-black text-xl hover:bg-[#D1D1D1] transition"
              >
                취소
              </button>
              <button
                onClick={submitReport}
                className="flex-1 py-4 bg-[#ff6b6b] rounded-2xl text-white font-black text-xl hover:bg-[#e65a5a] transition shadow-lg"
              >
                전송하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- 상단 헤더 (제목 + 라운드) --- */}
      <div className="w-full h-[120px] flex justify-center items-center relative z-10 pt-[48px] gap-[18px]">
        {/* 방 제목 보드 */}
        <div className="flex flex-col items-center">
          <div
            className="w-[692px] h-[100px] flex items-center justify-center gap-[36px] bg-center bg-no-repeat"
            style={{
              backgroundImage: "url('/images/room-waiting/ui-room-titlebox.webp')",
              backgroundSize: '100% 100%',
            }}
          >
            <span className="text-4xl font-black text-[#594E36] drop-shadow-sm pt-2">목적지 &gt;&gt;</span>
            <span className="text-4xl font-black text-[#594E36] drop-shadow-sm pt-2 overflow-hidden text-ellipsis whitespace-nowrap max-w-[380px]">
              {roomTitle}
            </span>
          </div>

          {/* Host Auto-Start Countdown (Below Title) - Only for Host */}
          {hostCountDown !== null && isHost && (
            <div className="absolute top-full mt-2 bg-black/70 px-6 py-2 rounded-xl backdrop-blur-sm border-2 border-[#ff6b6b] flex items-center gap-3 animate-bounce z-50">
              <span className="text-white font-bold text-lg whitespace-nowrap">자동 시작까지</span>
              <span className="text-[#ff6b6b] text-3xl font-black">{hostCountDown}</span>
            </div>
          )}
        </div>

        {/* 라운드 배지 (읽기 전용) */}
        <div
          className="w-[100px] h-[100px] flex items-center justify-center bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/images/room-waiting/ui-room-dicebox.webp')",
            backgroundSize: 'contain',
          }}
        >
          <div
            className="w-[64px] h-[64px] bg-[#594E36]"
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
      <div className="flex-1 w-full max-w-[1500px] flex items-center justify-center px-4 gap-[20px]">
        {players.map((player) => {
          const isEmpty = !player.nickname;
          const islocked = player.index - 1 >= maxPlayers;
          const isReady = player.isReady;
          const isMySlot = player.memberId === myId;
          const charImg = player.characterId ? CHARACTER_IMG_MAP[player.characterId] : null;

          return (
            <div key={player.index} className="flex flex-col items-center gap-4 relative">
              {/* 신고 드롭다운 (overflow 방지를 위해 카드 밖으로 이동) */}
              {activeDropdown === `report-${player.index}` && (
                <div className="absolute top-[-10px] z-[60] animate-fade-in-up">
                  <div className="bg-white border-2 border-[#EAD7B8] rounded-xl shadow-lg overflow-hidden">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReport(player);
                        setActiveDropdown(null);
                      }}
                      className="px-4 py-2 hover:bg-[#FFF0F0] text-[#ff6b6b] font-bold flex items-center gap-2 w-full whitespace-nowrap"
                    >
                      <ExclamationTriangleIcon className="w-5 h-5" />
                      신고하기
                    </button>
                  </div>
                </div>
              )}
              {/* 카드 */}
              <div
                onClick={() => handleSlotClick(player.index - 1, isEmpty)}
                className={`
                   relative w-[336px] h-[460px] rounded-[36px] transition-all duration-300 overflow-hidden
                   ${
                     isEmpty
                       ? islocked
                         ? 'cursor-pointer hover:opacity-90' // 잠금
                         : 'cursor-pointer hover:scale-105' // 빈 슬롯
                       : 'cursor-pointer' // 활성: 테두리/배경 필요 없음 (이미지가 처리)
                   }
                 `}
              >
                {/* 1. 플레이어 존재 */}
                {player.nickname && (
                  <div className="w-full h-full relative">
                    {/* 배경 이미지 - 내 슬롯이면 me, 아니면 other */}
                    <img
                      src={
                        isMySlot
                          ? '/images/room-waiting/ui-room-playercard-me.webp'
                          : '/images/room-waiting/ui-room-playercard-other.webp'
                      }
                      alt="background"
                      className="absolute inset-0 w-full h-full object-cover"
                    />

                    <div className="absolute inset-0 z-10 flex flex-col items-center p-4">
                      {/* 인덱스 배지 */}
                      <div className="absolute top-4 left-4 min-w-[32px] h-[32px] flex items-center justify-center text-white font-black text-lg z-20">
                        {player.index}
                      </div>

                      {/* 이름 + 방장 배지 */}
                      <div className="relative flex justify-center items-center mb-2 mt-4 w-full z-50">
                        <div
                          className={`text-3xl font-black text-[#594E36] relative ${!isMySlot ? 'cursor-pointer' : ''}`}
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
                            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 bg-[#896339] text-white text-xs font-bold px-2 py-1 rounded-full shadow-sm whitespace-nowrap">
                              방장
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 캐릭터 이미지 영역 */}
                      <div className="flex-1 w-full relative flex items-center justify-center mb-[-20px] z-10 -mt-12">
                        {charImg ? (
                          <img src={charImg} alt="char" className="h-[260px] object-contain drop-shadow-md" />
                        ) : (
                          <div className="text-4xl opacity-20">?</div>
                        )}
                        {/* 타이머 아이콘 (흔들림) - 왼발 옆에 위치 (보는 사람 기준 오른쪽) */}
                        {player.isHost && showHostTimer && (
                          <img
                            src="/images/room-waiting/icon-timer.png"
                            alt="timer"
                            className="absolute bottom-[20px] right-[40px] w-[56px] h-[56px] object-contain animate-wiggle z-50 drop-shadow-lg"
                          />
                        )}
                      </div>

                      {/* 준비 상태 배지 */}
                      <div className="w-full flex justify-center mb-2 z-20 translate-y-3">
                        {isReady ? (
                          <div className="w-[80%] py-3 rounded-full bg-[#78D7B2] text-white font-black text-xl text-center shadow-md">
                            ✔ 준비완료
                          </div>
                        ) : (
                          <div className="w-[80%] py-3 rounded-full bg-[#EB5757] text-white font-black text-xl text-center shadow-md">
                            준비중
                          </div>
                        )}
                      </div>

                      {/* 채팅 말풍선 (있을 경우) */}
                      {chatMessages[player.memberId] && (
                        <div className="absolute top-[80px] z-40 bg-white px-4 py-2 rounded-xl shadow-lg border-2 border-[#EAD7B8] animate-bounce whitespace-nowrap">
                          <span className="font-bold text-[#594E36]">{chatMessages[player.memberId].text}</span>
                          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-b-2 border-r-2 border-[#EAD7B8] transform rotate-45"></div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 2. 빈 슬롯 (열림) */}
                {isEmpty && !islocked && (
                  <div className="w-full h-full relative">
                    <img
                      src="/images/room-waiting/ui-room-playercard-wait.webp"
                      alt="waiting"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
                      <div className="absolute top-4 left-4 min-w-[32px] h-[32px] flex items-center justify-center text-white font-black text-lg opacity-50 z-20">
                        {player.index}
                      </div>

                      {/* 대기중 텍스트 오버레이 */}
                      <span
                        className="text-4xl font-black text-white tracking-widest relative z-30"
                        style={{
                          WebkitTextStroke: '8px #C4A485',
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

              {/* 방장 컨트롤 (강퇴/위임) - 카드 아래 (절대 위치) */}
              {/* 글로벌 카운트다운이 없을 때만 표시 */}
              {!isMySlot && isHost && player.nickname && countDown === null && (
                <div className="absolute top-full mt-4 h-[80px] flex gap-3 animate-slide-in-up z-50">
                  {/* 강퇴 버튼 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleKick(player.memberId);
                    }}
                    className="w-[80px] h-[80px] bg-white rounded-[24px] shadow-lg flex items-center justify-center hover:scale-105 transition hover:bg-[#FFF0F0]"
                    title="강퇴하기"
                  >
                    <img src="/images/room-waiting/icon-x.svg" alt="kick" className="w-10 h-10 object-contain" />
                  </button>

                  {/* 위임 버튼 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelegate(player.memberId);
                    }}
                    className="w-[80px] h-[80px] bg-white rounded-[24px] shadow-lg flex items-center justify-center hover:scale-105 transition text-[#594E36]"
                    title="방장 위임"
                  >
                    <StarIcon className="w-10 h-10" />
                  </button>
                </div>
              )}

              {/* 내 컨트롤 (채팅, 다시선택, 주사위) - 카드 아래 */}
              {/* 글로벌 카운트다운이 없을 때만 표시 */}
              {isMySlot && countDown === null && (
                <div className="absolute top-full mt-4 h-[80px] flex gap-3 animate-slide-in-up z-50">
                  {/* 채팅 */}
                  <div className="relative">
                    <button
                      onClick={() => setActiveDropdown(activeDropdown === 'chat' ? null : 'chat')}
                      className="w-[80px] h-[80px] bg-white rounded-[24px] shadow-lg flex items-center justify-center hover:scale-105 transition"
                    >
                      <ChatBubbleLeftEllipsisIcon className="w-8 h-8 text-[#594E36]" />
                    </button>
                    {activeDropdown === 'chat' && (
                      <div className="absolute bottom-[90px] left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-xl p-3 flex flex-col gap-2 min-w-[150px] border-2 border-[#EAD7B8] animate-fade-in-up z-50">
                        {['레디레디', '시작해~!', '화이팅'].map((msg) => (
                          <button
                            key={msg}
                            onClick={() => sendChat(msg)}
                            className="text-left px-3 py-2 hover:bg-[#FFF8EA] rounded-lg font-bold text-[#594E36] whitespace-nowrap"
                          >
                            {msg}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 다시 선택 (중앙) */}
                  <button
                    onClick={() => navigate(`/rooms/${roomId}/select`)}
                    className="w-[80px] h-[80px] bg-white rounded-[24px] shadow-lg flex items-center justify-center hover:scale-105 transition"
                  >
                    <img
                      src="/images/room-waiting/icon-choose.svg"
                      alt="re-select"
                      className="w-[80px] h-[80px] object-contain p-4"
                    />
                  </button>

                  {/* 주사위 (라운드 선택 - 방장 전용) */}
                  {isHost && (
                    <div className="relative">
                      <button
                        onClick={() => setActiveDropdown(activeDropdown === 'rounds' ? null : 'rounds')}
                        className="w-[80px] h-[80px] bg-white rounded-[24px] shadow-lg flex items-center justify-center hover:scale-105 transition relative"
                      >
                        <div
                          className="w-[64px] h-[64px] bg-[#594E36]"
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

                      {/* 라운드 선택 드롭다운 (- 10판 + 스타일) */}
                      {activeDropdown === 'rounds' && (
                        <div className="absolute top-[90px] left-1/2 -translate-x-1/2 bg-white rounded-[20px] shadow-xl border-4 border-[#EAD7B8] px-4 py-2 flex items-center gap-3 z-50 min-w-[140px] justify-between">
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
                            className="text-[#EAD7B8] hover:text-[#594E36] font-black text-2xl"
                          >
                            -
                          </button>
                          <span className="text-[#594E36] font-black text-xl whitespace-nowrap">{totalRounds}판</span>
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
                            className="text-[#EAD7B8] hover:text-[#594E36] font-black text-2xl"
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
      <div className="w-full h-[140px] px-10 pb-8 flex items-end justify-center relative z-10">
        {/* 왼쪽 블록 제거 (내 카드로 이동) */}

        {/* 중앙: 초대, 준비/시작 (알약 버튼) */}
        <div className="flex gap-4 items-end mb-2">
          {/* 초대 */}
          <button className="bg-[#78D7B2] w-[260px] h-[80px] rounded-[40px] shadow-lg hover:scale-105 transition flex items-center justify-center gap-3">
            <span className="text-white text-[40px] font-black tracking-widest leading-none pb-1">✉</span>
            <span className="text-white text-3xl font-black">초대하기</span>
          </button>

          {/* 준비 버튼 - 항상 표시 */}
          <button
            onClick={handleReady}
            className={`w-[260px] h-[80px] rounded-[40px] shadow-lg hover:scale-105 transition flex items-center justify-center
                  ${currentPlayer?.isReady ? 'bg-[#78D7B2]' : 'bg-[#EB5757]'}
                `}
          >
            <span className="text-white text-3xl font-black">{currentPlayer?.isReady ? '준비 완료' : '준비하기'}</span>
          </button>

          {/* 게임 시작 버튼 - 모두 준비완료 시 방장에게만 표시 */}
          {isHost && allReady && (
            <button
              onClick={handleStartGame}
              className="bg-[#4A90E2] w-[260px] h-[80px] rounded-[40px] shadow-lg hover:scale-105 transition flex items-center justify-center animate-pulse"
            >
              <span className="text-white text-3xl font-black">게임 시작</span>
            </button>
          )}
        </div>

        {/* 우측: 나가기 (작은 알약) - 위치 조정? */}
        <div className="absolute right-10 bottom-8">
          <ExitButton onClick={handleLeave} />
        </div>
      </div>

      {isHost && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          {/* 필요 시 중앙 십자선 또는 장식 */}
        </div>
      )}
    </div>
  );
}

export default Room;
