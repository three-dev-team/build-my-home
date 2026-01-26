import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import { leaveRoom } from '../../utils/roomUtils.js';
import { getBrokerURL } from '../../utils/ws.js';
import { getMyIdFromToken } from '../../utils/auth.js';
import { CHARACTERS } from '../../constants/characters.js';

// 캐릭터 ID -> 이미지 매핑
const CHARACTER_IMG_MAP = CHARACTERS.reduce((acc, char) => {
  acc[Number(char.id)] = char.selectBasicImage;
  return acc;
}, {});

function Room() {
  const { roomId } = useParams();
  const [loading, setLoading] = useState(true);
  const [roomTitle, setRoomTitle] = useState('');
  const [players, setPlayers] = useState([]);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [totalRounds, setTotalRounds] = useState(10);
  const [stompClient, setStompClient] = useState(null);

  // [NEW] 서버에서 동기화된 자동 시작 목표 시간 (Timestamp)
  const [targetStartTime, setTargetStartTime] = useState(null);

  // [NEW] 게임 시작 카운트다운 state (전체 유저용, 3초)
  const [countDown, setCountDown] = useState(null);
  // [NEW] 방장 전용 카운트다운 state (방장용, 5초)
  const [hostCountDown, setHostCountDown] = useState(null);

  // [NEW] 채팅 메시지 state: { [memberId]: { text: string, expireAt: number } }
  const [chatMessages, setChatMessages] = useState({});
  const [chatDropdownOpen, setChatDropdownOpen] = useState(false);

  // 채팅 메시지 만료 관리 (1초마다 체크)
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

  const navigate = useNavigate();
  const token = sessionStorage.getItem('token');
  const myId = getMyIdFromToken();
  const currentPlayer = players.find((player) => player.memberId === myId);
  const isHost = currentPlayer?.isHost;
  const allReady = players.filter((player) => player.nickname).every((player) => player.isReady);

  // 자동 시작 타이머 로직 (서버 시간 동기화)
  useEffect(() => {
    if (!targetStartTime) {
      if (countDown !== null) setCountDown(null);
      if (hostCountDown !== null) setHostCountDown(null);
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.ceil((targetStartTime - now) / 1000);

      // 1. 전체 카운트다운 (3초 이하) - 모든 유저에게 표시
      if (diff <= 3 && diff > 0) {
        setCountDown(diff);
        setHostCountDown(null); // 방장 카운트다운 종료
      }
      // 2. 방장 전용 카운트다운 (8초 이하 ~ 3초 초과) - 방장만 표시 (5초간: 8,7,6,5,4 -> 5,4,3,2,1)
      else if (diff <= 8 && diff > 3) {
        if (isHost) {
          setHostCountDown(diff - 3);
        }
        setCountDown(null);
      }
      // 3. 대기 구간 (13초 ~ 8초) - 아무것도 표시 안 함
      else if (diff > 8) {
        setCountDown(null);
        setHostCountDown(null);
      }
      // 4. 종료 (0초 이하)
      else if (diff <= 0) {
        setCountDown(0);
        setHostCountDown(null);

        if (isHost && diff === 0) {
          console.log('>>> 🚀 Auto-Start Triggered by Timer');
          stompClient.publish({
            destination: '/app/games/start',
            body: JSON.stringify({ roomId: roomId }),
          });
        }
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [targetStartTime, isHost, stompClient, roomId]);

  // 방 정보 불러오기 REST API 호출
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

  // 현재 플레이어 정보 WebSocket 연결
  useEffect(() => {
    if (loading) return;

    const client = new Client({
      brokerURL: getBrokerURL(),
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      onConnect: () => {
        console.log('>>> ✅ WebSocket 연결됨');

        client.subscribe(`/topic/rooms/${roomId}`, (message) => {
          const data = JSON.parse(message.body);
          console.log('>>> 🔔 메시지 수신:', data);

          if (data.type === 'GAME_START') {
            navigate(`/games/${roomId}`, { state: { initialGameData: data } });
          }

          if (data.maxPlayers) {
            setMaxPlayers(data.maxPlayers);
          }

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
                // 4명까지만 표시
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

            // [NEW] 서버 자동시작 시간 동기화
            setTargetStartTime(data.autoStartTime || null);
          }

          // [NEW] 채팅 수신 처리
          if (data.type === 'CHAT') {
            const senderId = data.memberId;
            const text = data.message;
            setChatMessages((prev) => ({
              ...prev,
              [senderId]: { text, expireAt: Date.now() + 3000 }, // 3초간 표시
            }));
          }

          // [NEW] 강퇴 처리
          if (data.type === 'PLAYER_KICKED') {
            if (Number(data.memberId) === Number(getMyIdFromToken())) {
              setShowKickedAlert(true);
            }
          }
        });

        // 현재 방 상태 요청 추가
        client.publish({
          destination: '/app/rooms/get-players',
          body: JSON.stringify({ roomId: roomId }),
        });
      },
    });

    client.activate();
    setStompClient(client);

    return () => {
      if (client.active) {
        client.deactivate();
        console.log('>>> ❌ WebSocket 연결 해제됨');
      }
    };
  }, [roomId, loading]); // maxPlayers 의존성 제거 (재연결 방지)

  const handleReady = () => {
    if (!stompClient) return;
    stompClient.publish({
      destination: '/app/rooms/ready',
      body: JSON.stringify({ roomId: roomId }),
    });
  };

  const handleStartGame = () => {
    console.log('게임 시작 버튼 클릭 -> 5초 타이머 강제 설정 요청');
    if (allReady && stompClient) {
      stompClient.publish({
        destination: '/app/rooms/start-timer',
        body: JSON.stringify({ roomId: roomId }),
      });
    }
  };

  const handleLeave = () => {
    leaveRoom(stompClient, roomId);
    navigate('/room-list');
  };

  const handleSettings = () => {
    console.log('설정 열기');
  };

  // [NEW] 슬롯 클릭 핸들러 (인원수 조절)
  const handleSlotClick = (index, isEmpty) => {
    if (!isHost) return;

    // 현재 인원수 (플레이어가 들어와 있는 수) 계산
    const currentPlayersCount = players.filter((p) => p.nickname).length;

    let newMax = maxPlayers;

    // 잠긴 슬롯 클릭 -> 열기 (확장)
    if (index >= maxPlayers) {
      newMax = index + 1;
    }
    // 열린 빈 슬롯 클릭 -> 닫기 (축소)
    else if (isEmpty) {
      // 만약 현재 인원수보다 줄이려고 하면 거부
      // 클릭한 슬롯이 'index'일 때, index + 1 명이 됨?
      // 예: index 2 (3번째) 클릭 -> newMax = 2 (0, 1번만 남김)
      // 단, 0, 1번에 사람이 있어야 하고 2번엔 없어야 함 (isEmpty true)
      // 만약 currentPlayersCount > index 이면 안됨
      if (currentPlayersCount > index) {
        // 이미 앞자리에 사람이 꽉 차있거나 해서 못 줄임?
        // 사실 index위치에 사람이 없으면(isEmpty) 줄여도 됨.
        // 하지만 index 미만 위치에 사람은 보존됨.
        // 문제: 만약 중간에 빈 자리가 있다면?
        // 로직상 순차적으로 채워지므로 index가 비었다면 그 뒤도 비었음.
        // 안전하게 index 값으로 설정.
        // 최소 2명 제한
        if (index < 2) return;
        newMax = index;
      } else {
        // 사람이 있는 위치보다 더 앞쪽을 닫으려 할 때
        // 예: 2명(0,1) 있는데 1번 클릭? isEmpty가 아닐것임.
        // isEmpty 체크했으므로 여기 올 일은 적음.
        if (index < 2) return;
        newMax = index;
      }
    } else {
      return; // 사람이 있는 슬롯은 클릭 무시
    }

    if (newMax !== maxPlayers && stompClient) {
      stompClient.publish({
        destination: '/app/rooms/update-settings',
        body: JSON.stringify({ roomId: Number(roomId), maxPlayers: newMax }),
      });
    }
  };

  // [NEW] 강퇴 관련 상태
  const [kickTargetId, setKickTargetId] = useState(null); // 강퇴할 대상 (방장용)
  const [showKickConfirm, setShowKickConfirm] = useState(false); // 강퇴 확인 모달 (방장용)
  const [showKickedAlert, setShowKickedAlert] = useState(false); // 강퇴 당함 알림 (대상자용)

  const handleKickBtnClick = (targetId) => {
    setKickTargetId(targetId);
    setShowKickConfirm(true);
  };

  const confirmKick = () => {
    if (!stompClient || !kickTargetId) return;
    stompClient.publish({
      destination: '/app/rooms/kick',
      body: JSON.stringify({ roomId: roomId, memberId: kickTargetId }),
    });
    setShowKickConfirm(false);
    setKickTargetId(null);
  };

  const cancelKick = () => {
    setShowKickConfirm(false);
    setKickTargetId(null);
  };

  const handleKickedConfirm = () => {
    setShowKickedAlert(false);
    navigate('/room-list');
  };

  // 채팅 전송 핸들러
  const sendChat = (text) => {
    if (!stompClient) return;
    stompClient.publish({
      destination: '/app/rooms/chat',
      body: JSON.stringify({ roomId: roomId, message: text }),
    });
    setChatDropdownOpen(false);
  };

  const CHAT_OPTIONS = ['레디레디', '시작해~!', '화이팅', '잠시만요', '빨리빨리', '안녕하세요'];

  if (loading) {
    return <div>로딩 중...</div>;
  }

  return (
    <div className="min-h-screen bg-[#fff8ea] flex flex-col items-center py-10 px-4 font-sans text-[#4b3a2e] relative">
      {/* 카운트다운 오버레이 (전체 유저, 3초) */}
      {countDown !== null && countDown > 0 && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div className="text-white text-4xl mb-8 font-bold animate-pulse">잠시 후 게임이 시작됩니다!</div>
          <div className="text-[#ffdf40] text-[10rem] font-black drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] scale-150 transition-transform duration-700 ease-out transform key={countDown}">
            {countDown}
          </div>
        </div>
      )}

      {/* [NEW] 방장 전용 자동 시작 카운트 (5초) */}
      {hostCountDown !== null && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[9000] bg-white/90 backdrop-blur px-8 py-4 rounded-full shadow-2xl border-4 border-[#ff6b6b] flex items-center gap-4 animate-in slide-in-from-top-4 duration-300">
          <div className="flex flex-col items-center">
            <span className="text-xs font-bold text-[#ff6b6b]">AUTO START</span>
            <span className="text-4xl font-black text-[#4b3a2e] w-12 text-center">{hostCountDown}</span>
          </div>
          <div className="h-10 w-[2px] bg-[#e5e5e5]"></div>
          <div className="text-sm font-bold text-[#6a5342]">
            모든 플레이어가 준비되어
            <br />
            잠시 후 게임이 시작됩니다.
          </div>
        </div>
      )}

      {/* [NEW] 강퇴 확인 모달 (방장용) */}
      {showKickConfirm && (
        <div className="fixed inset-0 z-[10000] bg-black/50 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl transform scale-100 animate-in zoom-in duration-200 border-4 border-[#ead7b8]">
            <h3 className="text-2xl font-black text-[#4b3a2e] mb-4 text-center">플레이어 강퇴</h3>
            <p className="text-[#6a5342] mb-8 text-center font-bold">정말 이 플레이어를 강퇴하시겠습니까?</p>
            <div className="flex gap-3">
              <button
                onClick={cancelKick}
                className="flex-1 py-3 rounded-full font-bold bg-[#f4efe6] text-[#6a5342] hover:bg-[#e5e5e5] transition"
              >
                취소
              </button>
              <button
                onClick={confirmKick}
                className="flex-1 py-3 rounded-full font-bold bg-[#ff6b6b] text-white hover:bg-[#ff5252] shadow-md transition"
              >
                강퇴하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* [NEW] 강퇴 알림 모달 (대상자용) */}
      {showKickedAlert && (
        <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl text-center border-4 border-[#ff6b6b]">
            <div className="text-5xl mb-4">🚫</div>
            <h3 className="text-2xl font-black text-[#4b3a2e] mb-2">강제 퇴장</h3>
            <p className="text-[#6a5342] mb-8 font-bold">방장에 의해 강퇴되었습니다.</p>
            <button
              onClick={handleKickedConfirm}
              className="w-full py-3 rounded-full font-bold bg-[#4b3a2e] text-white hover:bg-[#3d2f25] shadow-lg transition"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black mb-2">{roomTitle}</h1>
          <div className="flex gap-4 text-sm font-bold opacity-80">
            <span>
              👥 {players.filter((p) => p.nickname).length} / {maxPlayers}명
            </span>
            <span>🎲 {totalRounds}라운드</span>
          </div>
        </div>
        <button
          onClick={handleSettings}
          className="bg-[#efe2c8] hover:bg-[#d6b98a] text-[#6a5342] px-4 py-2 rounded-xl font-bold transition"
        >
          ⚙️ 설정
        </button>
      </div>

      {/* Players Grid */}
      <div className="w-full max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
        {players.map((player) => (
          <div
            key={player.index}
            onClick={() => handleSlotClick(player.index - 1, !player.nickname)}
            className={[
              'relative aspect-[3/4] rounded-[30px] border-[4px] flex flex-col items-center justify-center p-4 transition-all',
              player.nickname
                ? 'bg-white border-[#d6b98a] shadow-lg cursor-default'
                : player.index - 1 >= maxPlayers
                  ? 'bg-[#e5e5e5] border-[#ccc] cursor-pointer hover:bg-[#d4d4d4] opacity-80' // Locked/Closed
                  : 'bg-[#f4efe6] border-[#ead7b8] border-dashed cursor-pointer hover:bg-[#efe6d5]', // Open & Empty
            ].join(' ')}
          >
            {/* Ready Badge - Top Right */}
            {player.nickname && (
              <div
                className={[
                  'absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-black shadow-sm transition-all z-10',
                  player.isReady ? 'bg-[#7bb46b] text-white tracking-wider scale-110' : 'bg-[#e5e5e5] text-[#999]',
                ].join(' ')}
              >
                {player.isReady ? 'READY' : 'WAITING'}
              </div>
            )}
            {/* Host Badge - Top Left */}
            {player.isHost && <div className="absolute top-4 left-4 text-xl z-10">👑</div>}
            {/* Character / Slot Content */}
            <div className="flex-1 flex items-center justify-center w-full overflow-hidden">
              {player.nickname ? (
                player.characterId && CHARACTER_IMG_MAP[player.characterId] ? (
                  // 선택한 캐릭터 이미지 노출
                  <img
                    src={CHARACTER_IMG_MAP[player.characterId]}
                    alt="character"
                    className="w-full h-full object-contain drop-shadow-md"
                  />
                ) : (
                  // 캐릭터 미선택 시 ? 표시
                  <div className="text-4xl opacity-30">?</div>
                )
              ) : // 빈 슬롯 내용
              player.index - 1 >= maxPlayers ? (
                // 잠긴 상태
                <div className="flex flex-col items-center opacity-40">
                  <span className="text-4xl mb-2">🔒</span>
                  <span className="text-xs font-bold whitespace-nowrap">Open Slot</span>
                </div>
              ) : (
                // 열린 빈 슬롯
                <div className="flex flex-col items-center opacity-30">
                  {isHost && <span className="text-4xl mb-2">❌</span>}
                  <span className="text-[#d6b98a] font-bold">빈 슬롯</span>
                </div>
              )}
            </div>

            {/* Nickname & Actions */}
            <div className="w-full text-center mt-2 relative">
              {/* [NEW] 말풍선 (채팅 메시지) */}
              {chatMessages[player.memberId] && (
                <div className="absolute -top-24 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-2xl shadow-xl border-2 border-[#d6b98a] z-30 whitespace-nowrap animate-in zoom-in slide-in-from-bottom-2 duration-200">
                  <div className="text-lg font-black text-[#4b3a2e]">{chatMessages[player.memberId].text}</div>
                  {/* 말풍선 꼬리 */}
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-b-2 border-r-2 border-[#d6b98a] transform rotate-45"></div>
                </div>
              )}

              {player.nickname ? (
                <div className="flex flex-col items-center gap-1">
                  <span className="font-black text-lg truncate w-full px-2">{player.nickname}</span>

                  {/* My Character Select & Chat Button */}
                  {player.memberId === myId && (
                    <div className="flex items-center gap-2">
                      {!player.isReady && (
                        <button
                          onClick={() => navigate(`/rooms/${roomId}/select`)}
                          className="text-xs bg-[#efe2c8] px-3 py-1 rounded-full hover:bg-[#d6b98a] transition font-bold text-[#6a5342]"
                        >
                          캐릭터 변경
                        </button>
                      )}

                      {/* [NEW] Chat Button */}
                      <div className="relative">
                        <button
                          onClick={() => setChatDropdownOpen(!chatDropdownOpen)}
                          className="w-8 h-8 rounded-full bg-white border-2 border-[#d6b98a] flex items-center justify-center hover:bg-[#fff8ea] shadow-sm transition"
                          title="채팅"
                        >
                          💬
                        </button>

                        {/* Chat Dropdown */}
                        {chatDropdownOpen && (
                          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-32 bg-white rounded-xl shadow-xl border-2 border-[#d6b98a] overflow-hidden z-40 flex flex-col">
                            {CHAT_OPTIONS.map((opt) => (
                              <button
                                key={opt}
                                onClick={() => sendChat(opt)}
                                className="px-3 py-2 text-sm font-bold text-[#6a5342] hover:bg-[#efe2c8] transition text-left"
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        )}
                        {/* 드롭다운 닫기용 백드롭 (간단하게) */}
                        {chatDropdownOpen && (
                          <div className="fixed inset-0 z-30" onClick={() => setChatDropdownOpen(false)} />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Host Delegate */}
                  {isHost && player.memberId !== myId && (
                    <button
                      onClick={() => {
                        if (stompClient) {
                          stompClient.publish({
                            destination: '/app/rooms/delegate-host',
                            body: JSON.stringify({
                              roomId: Number(roomId),
                              memberId: player.memberId,
                            }),
                          });
                        }
                      }}
                      className="text-[10px] bg-[#ffd700]/20 hover:bg-[#ffd700] text-[#b38f00] hover:text-white px-2 py-0.5 rounded-full transition font-bold"
                    >
                      방장 위임
                    </button>
                  )}
                </div>
              ) : (
                <span className="text-sm opacity-0">.</span>
              )}

              {/* [NEW] Kick Button (Host Only) */}
              {isHost && player.nickname && player.memberId !== myId && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleKickBtnClick(player.memberId);
                  }}
                  className="absolute -top-3 -right-3 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md font-bold text-xs hover:bg-red-600 z-[20] border-2 border-white"
                  title="강퇴"
                >
                  ❌
                </button>
              )}
            </div>
            {/* My Slot Highlight */}
            {player.memberId === myId && (
              <div className="absolute inset-0 border-[4px] border-[#7bb46b] rounded-[30px] pointer-events-none opacity-50" />
            )}
          </div>
        ))}
      </div>

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-md border-t border-[#ead7b8] flex justify-center gap-4 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
        <button
          onClick={handleLeave}
          className="px-8 py-4 rounded-full font-black text-lg bg-[#e5e5e5] text-[#666] hover:bg-[#d4d4d4] transition"
        >
          나가기
        </button>

        <button
          onClick={handleReady}
          className={[
            'px-12 py-4 rounded-full font-black text-xl text-white transition transform active:scale-95 shadow-lg flex-1 max-w-sm',
            currentPlayer?.isReady ? 'bg-[#7bb46b] hover:bg-[#6aa65a]' : 'bg-[#d6b98a] hover:bg-[#c5a676]',
          ].join(' ')}
        >
          {currentPlayer?.isReady ? '준비 완료!' : '준비 하기'}
        </button>

        {isHost && (
          <button
            onClick={handleStartGame}
            disabled={!allReady}
            className={[
              'px-12 py-4 rounded-full font-black text-xl text-white transition transform active:scale-95 shadow-lg flex-1 max-w-sm',
              allReady ? 'bg-[#4A90E2] hover:bg-[#357ABD] animate-pulse' : 'bg-gray-300 cursor-not-allowed opacity-50',
            ].join(' ')}
          >
            게임 시작
          </button>
        )}
      </div>

      {/* Add padding for fixed bottom bar */}
      <div className="h-24"></div>
    </div>
  );
}

export default Room;
