import { useEffect, useState, useRef, useMemo } from 'react';
import { Client } from '@stomp/stompjs';
import { getBrokerURL } from '../../utils/ws.js';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import AspectLayout from '../../components/layout/AspectLayout.jsx';
import Loading from '../../components/common/Loading.jsx';
import RollForOrder from './RollForOrder.jsx';
import { getMyIdFromToken } from '../../utils/auth.js';
import MainBoardPage from './MainBoardPage.jsx';
import GameIntro from './GameIntro.jsx';
import PlayerStatusPanel from './PlayerStatusPanel.jsx';
import Loan from './atm/Loan.jsx';
import Stamp from './Stamp.jsx';
import PlayerActionPanel from './PlayerActionPanel.jsx';
import RollDicePage from './RollDicePage.jsx';
import KK from './KK.jsx';
import ShopPage from './shop/ShopPage.jsx';
import TurnCounter from './TurnCounter.jsx';
import House from './house/House.jsx';
import Fishing from './fishing/Fishing.jsx';
import Inventory from './Inventory.jsx';
import RewardTile from './rewardTile/RewardTile.jsx';
import Start from './Start.jsx';
import Result from './Result.jsx';
import Mupani from './Mupani.jsx';
import Machurilla from './Machurilla/Machurilla.jsx';
import PlayerSkipped from './PlayerSkipped.jsx';
import ItemTile from './ItemTile/ItemTile.jsx';
import ItemInventory from './ItemInventory.jsx';
import Pipe from './itemEffect/Pipe.jsx';
import Mirror from './itemEffect/Mirror.jsx';
import RadishSell from './radish/RadishSell.jsx';
import './css/GamePage.css';
import TurnCharacterPanel from './TurnCharacterPanel.jsx';
import Swap from './swap/Swap.jsx';

import Subtitle from '../../components/common/Subtitle.jsx';
import DialogBox from '../../components/common/DialogBox.jsx';
import { COLORS, withAlpha } from '../../constants/colors.js';
import { CHARACTERS } from '../../constants/characters.js';
import CustomDice from './itemEffect/CustomDice.jsx';
import GoldDice from './itemEffect/GoldDice.jsx';
import DoubleDice from './itemEffect/DoubleDice.jsx';

const GamePage = () => {
  // 라우트 파라미터/네비게이션 핸들러
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // 로그인 토큰(웹소켓 Authorization 헤더로 사용)
  const token = sessionStorage.getItem('token');

  // 내 memberId(JWT에서 파싱)
  const myId = getMyIdFromToken();

  // 초기 gameState는 라우팅 state로 들어온 값이 있으면 사용(없으면 null)
  const [gameState, setGameState] = useState(location.state?.initialGameData || null);

  // STOMP client 인스턴스 저장(연결 후 set)
  const [stompClient, setStompClient] = useState(null);

  // 인벤토리,ATM 어디서 열었는지 기억(BOARD/HOUSE)
  const inventoryOriginRef = useRef(null);
  const atmOriginRef = useRef(null);

  // ATM/인벤 오버레이 열림 상태(프론트 로컬)
  const [atmOpen, setAtmOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);

  // 관전자용: 현재 누가 인벤/ATM 사용 중인지
  const [inventoryUsingMemberId, setInventoryUsingMemberId] = useState(null);
  const [atmUsingMemberId, setAtmUsingMemberId] = useState(null);

  // 낚시: ROOM_EVENT_* 메시지는 gameState와 분리해서 저장(상태 덮어쓰기 방지)
  const [fishingEventMessage, setFishingEventMessage] = useState(null);

  // 상점: 선택 relay 메시지 저장(상점 세션 동기화 보조)
  const [shopRelay, setShopRelay] = useState(null);

  const [radishSellResult, setRadishSellResult] = useState({ qty: 0, amount: 0, memberId: null });

  // players가 배열/객체로 올 수 있어서 항상 배열로 정규화
  const playersArr = useMemo(() => {
    const p = gameState?.players;
    if (Array.isArray(p)) return p;
    if (p && typeof p === 'object') return Object.values(p);
    return [];
  }, [gameState?.players]);

  const findPlayerByMemberId = (arr, memberId) => arr.find((p) => Number(p?.memberId) === Number(memberId)) || null;

  const findCharacterByPlayer = (player) => {
    const cid = Number(player?.characterId ?? 0);
    return CHARACTERS.find((c) => Number(c.id) === cid) || null;
  };

  // 관전자 대기용 플레이어/캐릭터
  const inventoryUsingPlayer = useMemo(() => {
    if (!inventoryUsingMemberId) return null;
    return findPlayerByMemberId(playersArr, inventoryUsingMemberId);
  }, [inventoryUsingMemberId, playersArr]);

  const inventoryUsingCharacter = useMemo(() => {
    return findCharacterByPlayer(inventoryUsingPlayer);
  }, [inventoryUsingPlayer]);

  const atmUsingPlayer = useMemo(() => {
    if (!atmUsingMemberId) return null;
    return findPlayerByMemberId(playersArr, atmUsingMemberId);
  }, [atmUsingMemberId, playersArr]);

  const atmUsingCharacter = useMemo(() => {
    return findCharacterByPlayer(atmUsingPlayer);
  }, [atmUsingPlayer]);

  // 현재 턴 플레이어(현 상태의 currentPlayerId 기준)
  const currentPlayer = playersArr.find((p) => Number(p?.memberId) === Number(gameState?.currentPlayerId)) || null;

  // 내 턴 여부(현재 턴 플레이어가 나인지)
  const isParticipant = playersArr.some((p) => Number(p?.memberId) === Number(myId));
  const isMyTurn = gameState && isParticipant ? Number(myId) === Number(gameState.currentPlayerId) : false;

  // 내 상태(무 개수/썩는 턴 가이드 등)
  const myPlayerState = playersArr.find((p) => Number(p?.memberId) === Number(myId)) || null;

  // 무 썩는 턴 안내 문구(radishRemoveRound 기준)
  const getRadishDecayGuide = (player, currentRound) => {
    const qty = Number(player?.radishQty ?? 0);
    const removeRound = player?.radishRemoveRound;

    if (!qty || qty <= 0) return null;
    if (typeof removeRound !== 'number') return null;
    if (typeof currentRound !== 'number') return null;

    const remain = removeRound - currentRound;

    if (remain >= 2) return `${remain}턴 후에 무가 썩는다구리`;
    if (remain === 1) return '다음턴에 무가 썩는다구리';
    if (remain === 0) return '이번턴에 무가 썩는다구리';
    return '무가 썩었다구리~';
  };

  const radishGuideText = getRadishDecayGuide(myPlayerState, gameState?.currentRound);

  // 현재 상태값 편의 변수
  const status = gameState?.status;

  // 내 화면에서 직접 여는 오버레이만 따로 분리
  const isLocalOverlayOpen = inventoryOpen || atmOpen;
  const isSpectatorWait = !isLocalOverlayOpen && (!!inventoryUsingMemberId || !!atmUsingMemberId);

  // 오버레이(ATM/인벤) 열림 여부: HUD 숨기기/보드 렌더 제어에 사용
  const isOverlayOpen = isLocalOverlayOpen || isSpectatorWait;

  // 보드 장면(= HUD 노출이 필요한 구간)
  const isBoardScene = status === 'WAITING_PLAYER_ACTION' || status === 'MOVING';

  // 보드 HUD(턴카운터/좌측 HUD 등) 노출 조건
  const shouldShowHud = !!gameState && isBoardScene && !isOverlayOpen;

  // House 배경은 step(너굴이면 naugul bg, 아니면 main bg)
  const houseStep = Number(currentPlayer?.uiStep ?? 0);
  const houseBgUrl =
    houseStep === 1 ? '/images/board/bg-buildhouse-naugul.webp' : '/images/board/bg-buildhouse-main.webp';

  // 배경 이미지
  const BG = {
    ATM: '/images/board/bg-atm.webp',
    BOARD: '/images/bg-home.png',
  };

  const bgImage = useMemo(() => {
    if (atmOpen || !!atmUsingMemberId) return `url('${BG.ATM}')`;

    const inventoryAny = inventoryOpen || !!inventoryUsingMemberId;
    if (inventoryAny) {
      // 내가 인벤 열었을 때: origin 따라 배경 유지
      if (inventoryOpen) {
        if (inventoryOriginRef.current === 'HOUSE') return `url('${houseBgUrl}')`;
        return `url('${BG.BOARD}')`;
      }
      // 관전자: 누군가 인벤 중이면, 현재 상태가 HOUSE면 houseBg 유지
      return status === 'WAITING_HOUSE' ? `url('${houseBgUrl}')` : `url('${BG.BOARD}')`;
    }

    if (status === 'WAITING_HOUSE') return `url('${houseBgUrl}')`;
    return `url('${BG.BOARD}')`;
  }, [atmOpen, atmUsingMemberId, inventoryOpen, inventoryUsingMemberId, status, houseBgUrl]);
  const cssVars = useMemo(() => ({ '--bg-image': bgImage }), [bgImage]);

  useEffect(() => {
    const joinedRoom = sessionStorage.getItem('joinedRoom');
    if (joinedRoom !== roomId) {
      navigate('/room-list', { replace: true });
    }
  }, [roomId, navigate]);

  // 토큰 없으면 로그인 페이지로 이동
  useEffect(() => {
    if (!token) {
      alert('로그인이 필요합니다.');
      navigate('/');
    }
  }, [token, navigate]);

  // 상점 상태가 아니면 relay 메시지 초기화
  useEffect(() => {
    if (gameState?.status !== 'WAITING_SHOP') {
      setShopRelay(null);
    }
  }, [gameState?.status]);

  // 낚시 상태가 끝나면 ROOM_EVENT 잔상 제거
  useEffect(() => {
    const s = gameState?.status;
    const isFishing = s === 'WAITING_FISHING' || s === 'FISHING_IN_PROGRESS';
    if (!isFishing) setFishingEventMessage(null);
  }, [gameState?.status]);

  // STOMP 연결 + 구독 + 초기 상태 요청
  useEffect(() => {
    const client = new Client({
      brokerURL: getBrokerURL(),
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      onConnect: () => {
        console.log('>>> ✅ WebSocket 연결됨');
        setStompClient(client);

        // 게임 메인 토픽 구독
        client.subscribe(`/topic/games/${roomId}`, (message) => {
          const data = JSON.parse(message.body);
          console.log('>>> 🔔 메시지 수신:', data);

          const t = data?.type;

          // 낚시/룸이벤트: gameState를 덮지 않고 분리 저장(UI 전용 처리)
          const isRoomEvent = typeof t === 'string' && t.startsWith('ROOM_EVENT_');
          const isFishingError = t === 'ERROR' && typeof data?.eventType === 'string' && data.eventType === 'FISHING';

          if (isRoomEvent || isFishingError) {
            setFishingEventMessage(data);
            return;
          }

          // 상점: 선택 relay 메시지(세션 덮어쓰기 최소화)
          if (t === 'SHOP_SELECT_RELAY') {
            setShopRelay(data);

            if (data.shopSession) {
              setGameState((prev) => ({ ...prev, shopSession: data.shopSession }));
            }
            return;
          }
          if (t === 'SHOP_SELECT_CLEAR') {
            setShopRelay(null);
            return;
          }

          if (t === 'RADISH_SOLD') {
            setRadishSellResult({
              qty: Number(data?.quantity ?? 0),
              amount: Number(data?.amount ?? 0),
              memberId: data?.memberId ?? null,
            });
            if (data && typeof data === 'object' && 'status' in data) {
              setGameState(data);
            }
            return;
          }

          // ATM OPEN/CLOSE: 나/관전자 모두 처리
          if (t === 'ATM_OPENED') {
            const openedId = data?.memberId;
            if (Number(openedId) === Number(myId)) {
              setAtmOpen(true);
              setAtmUsingMemberId(null); // 내가 열면 관전자 대기 해제
            } else {
              setAtmUsingMemberId(openedId ?? null);
            }
            return;
          }

          if (t === 'ATM_CLOSED') {
            const closedId = data?.memberId;
            if (Number(closedId) === Number(myId)) {
              setAtmOpen(false);
              atmOriginRef.current = null;
            }
            setAtmUsingMemberId((prev) => (Number(prev) === Number(closedId) ? null : prev));
            return;
          }

          // INVENTORY OPEN/CLOSE: 나/관전자 모두 처리
          if (t === 'INVENTORY_OPENED') {
            const openedId = data?.memberId;
            if (Number(openedId) === Number(myId)) {
              setInventoryOpen(true);
              setInventoryUsingMemberId(null); // 내가 열면 관전자 대기 해제
            } else {
              setInventoryUsingMemberId(openedId ?? null);
            }
            return;
          }

          if (t === 'INVENTORY_CLOSED') {
            const closedId = data?.memberId;
            if (Number(closedId) === Number(myId)) {
              setInventoryOpen(false);
              inventoryOriginRef.current = null;
            }
            setInventoryUsingMemberId((prev) => (Number(prev) === Number(closedId) ? null : prev));
            return;
          }

          // 기본: 서버에서 온 gameState로 동기화
          if (data && typeof data === 'object' && 'status' in data) {
            setGameState(data);
          }
        });

        // 중복 로그인 감지(서버가 /user/queue/kick 보내면 강제 로그아웃)
        client.subscribe('/user/queue/kick', () => {
          console.log('>>> 🚫 중복 로그인 감지: 강제 로그아웃');
          alert('다른 기기에서 접속하여 로그아웃 되었습니다.');
          sessionStorage.clear();
          localStorage.clear();
          navigate('/');
        });

        // 연결 직후 현재 게임 상태 요청(새로고침/재접속 대비)
        client.publish({
          destination: '/app/games/get-state',
          body: JSON.stringify({ roomId: roomId }),
        });
      },
      onStompError: (frame) => {
        const errorMsg = frame.headers['message'];
        console.error('STOMP 에러:', errorMsg);

        alert('게임 연결에 문제가 발생했습니다: ' + errorMsg);
        navigateRef.current(`/rooms/${roomId}`);
      },
    });

    client.activate();

    // 언마운트 시 연결 해제
    return () => {
      if (client.active) {
        client.deactivate();
        setStompClient(null);
        console.log('>>> ❌ WebSocket 연결 해제됨');
      }
    };
  }, [roomId, token, navigate, myId]);

  // 인트로 종료 신호(서버에 intro-complete publish)
  const handleIntroComplete = () => {
    if (!stompClient) return;
    stompClient.publish({
      destination: '/app/games/intro-complete',
      body: JSON.stringify({ roomId: roomId }),
    });
  };

  // 순서 정하기 주사위 굴리기
  const handleRollDiceForOrder = () => {
    if (!stompClient) return;
    stompClient.publish({
      destination: `/app/games/roll-order`,
      body: JSON.stringify({ roomId: roomId }),
    });
  };

  // 인벤/ATM 오버레이: 로컬 state로 열고 닫기 + 서버에 배너용 OPEN/CLOSE만 알림
  const openInventory = (origin) => {
    if (!stompClient) return;
    if (!isMyTurn || gameState?.status === 'MOVING') return;
    inventoryOriginRef.current = origin; // 'HOUSE' | 'BOARD'
    setInventoryOpen(true);
    stompClient.publish({
      destination: '/app/games/action',
      body: JSON.stringify({ roomId, type: 'OPEN_INVENTORY' }),
    });
  };

  const closeInventory = () => {
    if (!stompClient) return;
    setInventoryOpen(false);
    inventoryOriginRef.current = null;
    stompClient.publish({
      destination: '/app/games/action',
      body: JSON.stringify({ roomId, type: 'CLOSE_INVENTORY' }),
    });
  };

  const openAtm = (origin) => {
    if (!stompClient) return;
    if (!isMyTurn || gameState?.status === 'MOVING') return;
    atmOriginRef.current = origin; // 'HOUSE' | 'BOARD'
    setAtmOpen(true);
    stompClient.publish({
      destination: '/app/games/action',
      body: JSON.stringify({ roomId, type: 'OPEN_ATM' }),
    });
  };

  const closeAtm = () => {
    if (!stompClient) return;
    setAtmOpen(false);
    atmOriginRef.current = null;
    stompClient.publish({
      destination: '/app/games/action',
      body: JSON.stringify({ roomId, type: 'CLOSE_ATM' }),
    });
  };

  // 공통 액션 전송(턴 체크/예외 처리 포함)
  const handleAction = (actionType, payload) => {
    if (!stompClient) return;

    // 무파니는 전원 동시 결정이라 턴 무관 예외 허용
    const allowAnyPlayerAction =
      gameState?.status === 'WAITING_MUPANI' && ['RADISH_BUY', 'RADISH_SKIP'].includes(actionType);

    // 내 턴 아니면 차단(무파니 예외) + MOVING 중엔 항상 차단
    if ((!isMyTurn && !allowAnyPlayerAction) || gameState.status === 'MOVING') {
      console.warn('내 턴이 아니거나 캐릭터가 이동 중입니다.');
      return;
    }

    stompClient.publish({
      destination: '/app/games/action',
      body: JSON.stringify({
        roomId: roomId,
        type: actionType,
        ...payload,
      }),
    });
  };

  // 액션 패널 닫기(내 턴에서만 CLOSE_ACTION)
  const handleCloseAction = () => {
    if (!stompClient || !isMyTurn) return;

    stompClient.publish({
      destination: '/app/games/action',
      body: JSON.stringify({ roomId, type: 'CLOSE_ACTION' }),
    });
  };

  // 이벤트 종료(서버에 event-complete publish) + 낚시 이벤트 메시지 초기화
  const handleEventComplete = () => {
    if (!stompClient) return;

    stompClient.publish({
      destination: '/app/games/event-complete',
      body: JSON.stringify({ roomId }),
    });

    setFishingEventMessage(null);
  };

  const handleFishingExitLocal = () => {
    setFishingEventMessage(null);
  };

  // 낚시 시작(미니게임 start)
  const handleFishingStart = (useBait = false) => {
    if (!stompClient) return;

    stompClient.publish({
      destination: '/app/games/fishing/start',
      body: JSON.stringify({ roomId: Number(roomId), useBait: !!useBait }),
    });
  };

  // 낚시 액션(HIT/REEL_START/REEL_STOP 등)
  const handleFishingAction = (action) => {
    if (!stompClient) return;

    stompClient.publish({
      destination: '/app/games/fishing/action',
      body: JSON.stringify({ roomId: Number(roomId), action }),
    });
  };

  // 무파니: buy/skip 래퍼
  const handleMupaniBuy = (qty) => handleAction('RADISH_BUY', { quantity: qty });
  const handleMupaniSkip = () => handleAction('RADISH_SKIP', {});

  // 룸 나가기(룸리스트 leave publish)
  const handleLeaveRoom = () => {
    if (!stompClient) return;
    console.log('>>> 🚪 Explicit Leave Room Triggered');
    stompClient.publish({
      destination: '/app/roomlist/rooms/leave',
      body: JSON.stringify({ roomId: Number(roomId) }),
    });
  };

  // 초기 상태 로드 전이면 로딩만 표시
  if (!gameState) {
    return (
      <AspectLayout>
        <div className="game-root">
          <Loading />
        </div>
      </AspectLayout>
    );
  }

  // 낚시 페이즈인지(상태 + 소켓 연결 확인)
  const isFishingPhase = ['WAITING_FISHING', 'FISHING_IN_PROGRESS'].includes(gameState?.status);
  const showInventorySpectatorWait = isSpectatorWait && !!inventoryUsingMemberId;
  const showAtmSpectatorWait = isSpectatorWait && !inventoryUsingMemberId && !!atmUsingMemberId;

  return (
    <AspectLayout>
      <div className="game-root">
        {/* 배경: CSS 변수로 상태에 따라 이미지 교체 */}
        <div className="game-bg" aria-hidden="true" style={cssVars} />

        <div className="game-stage">
          {/* 상단 턴 카운터/시세/무 안내(HUD) */}
          {shouldShowHud && (
            <TurnCounter
              currentRound={gameState.currentRound || 1}
              totalRounds={gameState.totalRounds || 20}
              radishPrice={gameState.radishPrice}
              radishQty={Number(myPlayerState?.radishQty ?? 0)}
              radishGuideText={radishGuideText}
            />
          )}

          {/* 좌측 HUD(액션 패널 + 턴 캐릭터) */}
          {shouldShowHud && (
            <div className="left-hud">
              {gameState.status === 'WAITING_PLAYER_ACTION' && isMyTurn && stompClient ? (
                <PlayerActionPanel
                  isMyTurn={isMyTurn}
                  items={currentPlayer?.items || []}
                  onSelectDice={() => {
                    stompClient.publish({
                      destination: '/app/games/select-dice',
                      body: JSON.stringify({ roomId }),
                    });
                  }}
                  onSelectItem={() => {
                    stompClient.publish({
                      destination: '/app/games/action',
                      body: JSON.stringify({ roomId, type: 'OPEN_ITEM_INVENTORY' }),
                    });
                  }}
                  onATM={() => openAtm('BOARD')}
                  onBuildHouse={() => {
                    stompClient.publish({
                      destination: '/app/games/action',
                      body: JSON.stringify({ roomId, type: 'BUILD_HOUSE' }),
                    });
                  }}
                  onMupaniPanel={() => {
                    stompClient.publish({
                      destination: '/app/games/action',
                      body: JSON.stringify({ roomId, type: 'OPEN_RADISH_SELL' }),
                    });
                  }}
                  onInventory={() => openInventory('BOARD')}
                  itemUsed={currentPlayer?.itemUsed}
                  radishQty={Number(myPlayerState?.radishQty ?? 0)}
                />
              ) : (
                <div className="left-hud-action-spacer" aria-hidden="true" />
              )}

              {/* 현재 턴 캐릭터(초상/아이콘) */}
              <TurnCharacterPanel players={playersArr} currentPlayerId={gameState.currentPlayerId} />
            </div>
          )}

          {/* 관전자 인벤토리 대기 */}
          {showInventorySpectatorWait && (
            <div className="spectator-wait">
              <Subtitle
                nameText={inventoryUsingPlayer?.nickname || '플레이어'}
                nameColor={inventoryUsingCharacter?.color || COLORS.ac.nookCyan}
                contentText={
                  `하아~ 집을 언제쯤 지을 수 있으려나...\n` +
                  `재료가 얼마나 모였는지 인벤토리 좀 보고 올게~\n` +
                  `잠깐만 기다려 줘!` +
                  (inventoryUsingCharacter?.habit ? ` ${inventoryUsingCharacter.habit}~!` : '')
                }
                highlights={[
                  {
                    text: inventoryUsingPlayer?.nickname || '',
                    color: inventoryUsingCharacter?.color || COLORS.ac.nookCyan,
                  },
                ]}
                options={[]}
                optionDisabled
                showTriangle={false}
                typingSpeed={30}
              />
            </div>
          )}

          {/* 관전자 ATM 대기 */}
          {showAtmSpectatorWait && (
            <div className="spectator-wait">
              {atmUsingCharacter?.rightImage && (
                <div
                  style={{
                    position: 'absolute',
                    right: 'calc(884 * var(--s))',
                    bottom: 'calc(416 * var(--s))',
                    width: 'calc(200 * var(--s))',
                    height: 'calc(460 * var(--s))',
                    zIndex: 25010,
                    pointerEvents: 'none',
                  }}
                >
                  <img
                    src={atmUsingCharacter.rightImage}
                    alt="atm-using-character"
                    draggable={false}
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'block',
                      objectFit: 'contain',
                      objectPosition: 'center bottom',
                    }}
                  />
                </div>
              )}

              {(() => {
                const name = atmUsingPlayer?.nickname || '플레이어';
                const nickColor = atmUsingCharacter?.color || COLORS.ac.nookCyan;

                return (
                  <DialogBox
                    open
                    className="spectator-wait-dialog"
                    text={`${name} 님이 ATM을 이용 중입니다\n보안 상의 이유로 잠시만 대기해주세요`}
                    highlights={[{ text: name, color: nickColor }]}
                    typingSpeed={30}
                    optionDisabled
                    options={[]}
                  />
                );
              })()}
            </div>
          )}

          {/* 무파니 UI(턴 무관 선택 구간 포함) */}
          <Mupani gameState={gameState} myId={myId} onBuy={handleMupaniBuy} onSkip={handleMupaniSkip} />

          <main className="game-main">
            {/* 인트로 */}
            {gameState.status === 'INTRO' && stompClient && <GameIntro onSkip={handleIntroComplete} />}

            {/* 순서 정하기 */}
            {gameState.status === 'DETERMINING_ORDER' && stompClient && (
              <RollForOrder
                players={playersArr}
                myId={myId}
                onRoll={handleRollDiceForOrder}
                onOrderComplete={() => {
                  stompClient.publish({
                    destination: '/app/games/order-complete',
                    body: JSON.stringify({ roomId }),
                  });
                }}
              />
            )}

            {/* 스킵 알림 */}
            {gameState.status === 'PLAYER_SKIPPED' && (
              <PlayerSkipped
                key={currentPlayer?.memberId}
                isMyTurn={isMyTurn}
                player={currentPlayer}
                onExit={handleEventComplete}
              />
            )}

            {/* 대출(은행 타일) */}
            {gameState.status === 'WAITING_LOAN' && (
              <Loan
                player={currentPlayer}
                isMyTurn={isMyTurn}
                currentPlayerName={currentPlayer?.nickname}
                currentPlayerCharacterId={currentPlayer?.characterId}
                userBell={currentPlayer?.bell || 0}
                userLoan={currentPlayer?.loan || 0}
                timeoutSeconds={gameState.timeoutSeconds || 0}
                onExit={handleEventComplete}
                onAction={handleAction}
                isBankTile={true}
              />
            )}

            {/* 스탬프 */}
            {gameState.status === 'WAITING_STAMP' && (
              <Stamp
                isMyTurn={isMyTurn}
                player={currentPlayer}
                currentPlayerName={currentPlayer?.nickname}
                timeoutSeconds={gameState.timeoutSeconds || 0}
                onAction={handleAction}
                onExit={handleEventComplete}
              />
            )}

            {/* 낚시 */}
            {isFishingPhase && (
              <Fishing
                key={`${roomId}-${gameState.currentRound}-${gameState.currentPlayerId}`}
                roomId={roomId}
                isMyTurn={isMyTurn}
                currentPlayerCharacterId={currentPlayer?.characterId}
                currentPlayerName={currentPlayer?.nickname}
                timeoutSeconds={gameState.timeoutSeconds || 0}
                eventMessage={fishingEventMessage}
                onExit={handleFishingExitLocal}
                onStartFishing={handleFishingStart}
                onFishingAction={handleFishingAction}
              />
            )}

            {/* 상점 */}
            {gameState.status === 'WAITING_SHOP' && (
              <ShopPage
                gameState={gameState}
                currentPlayer={currentPlayer}
                myId={myId}
                handleAction={handleAction}
                onExit={handleEventComplete}
                timeoutSeconds={gameState.timeoutSeconds || 0}
                shopRelay={shopRelay}
              />
            )}

            {/* KK */}
            {gameState.status === 'WAITING_KK' && (
              <KK
                isMyTurn={isMyTurn}
                currentPlayerName={currentPlayer?.nickname}
                userBell={currentPlayer?.bell || 0}
                timeoutSeconds={gameState.timeoutSeconds || 0}
                onAction={(type, payload) => handleAction(type, payload)}
                onExit={handleEventComplete}
                player={currentPlayer}
              />
            )}

            {/* 재화/수확 타일(보상) */}
            {(gameState.status === 'WAITING_RESOURCES' || gameState.status === 'WAITING_HARVEST') && (
              <RewardTile
                roomId={roomId}
                stompClient={stompClient}
                gameState={gameState}
                isMyTurn={isMyTurn}
                onStart={() => {}}
                onClose={() => {
                  if (isMyTurn) handleEventComplete();
                }}
              />
            )}

            {/* 스왑 */}
            {gameState.status === 'WAITING_SWAP' && (
              <Swap
                isMyTurn={isMyTurn}
                player={currentPlayer}
                players={gameState.players}
                gameState={gameState}
                onAction={handleAction}
                onExit={handleEventComplete}
              />
            )}

            {/* 스타트(이벤트) */}
            {gameState.status === 'WAITING_START' && (
              <Start
                isMyTurn={isMyTurn}
                player={currentPlayer}
                currentPlayerName={currentPlayer?.nickname}
                onAction={handleAction}
                onExit={handleEventComplete}
              />
            )}

            {/* 마추릴라 */}
            {gameState.status === 'WAITING_MACHURILLA' && (
              <Machurilla
                isMyTurn={isMyTurn}
                player={currentPlayer}
                currentPlayerName={currentPlayer?.nickname}
                onAction={handleAction}
                onExit={handleEventComplete}
              />
            )}

            {/* 아이템 획득 타일 */}
            {gameState.status === 'WAITING_ITEMS' && (
              <ItemTile
                gameState={gameState}
                myId={myId}
                isMyTurn={isMyTurn}
                onAction={handleAction}
                onExit={handleEventComplete}
              />
            )}

            {/* 게임 종료 */}
            {gameState.status === 'FINISHED' && (
              <Result gameState={gameState} myId={myId} roomId={roomId} onLeave={handleLeaveRoom} />
            )}

            {/* 파이프 아이템 효과 */}
            {gameState.status === 'WAITING_PIPE' && (
              <Pipe isMyTurn={isMyTurn} actionDataStr={currentPlayer?.actionDataStr} onAction={handleAction} />
            )}

            {/* 미러 아이템 효과 */}
            {gameState.status === 'WAITING_MIRROR' && (
              <Mirror
                isMyTurn={isMyTurn}
                actionDataStr={currentPlayer?.actionDataStr}
                players={playersArr}
                onAction={handleAction}
              />
            )}

            {/* 내 맘대로 주사위 아이템 효과 */}
            {gameState.status === 'WAITING_CUSTOM_DICE' && (
              <CustomDice
                player={currentPlayer}
                isMyTurn={isMyTurn}
                onSelect={(value) => {
                  stompClient.publish({
                    destination: '/app/games/action',
                    body: JSON.stringify({
                      roomId,
                      type: 'CUSTOM_DICE_SELECT',
                      actionData: value,
                    }),
                  });
                }}
              />
            )}

            {/* 골드 주사위 효과 */}
            {(gameState.status === 'WAITING_GOLD_DICE' || gameState.status === 'ROLLING_GOLD_DICE') && (
              <GoldDice
                player={currentPlayer}
                isMyTurn={isMyTurn}
                bellAmount = {currentPlayer?.actionData || 0}
                diceValue={currentPlayer?.diceValue}
                onRoll={() => {
                  stompClient.publish({
                    destination: '/app/games/action',
                    body: JSON.stringify({ roomId, type: 'GOLD_DICE_ROLL' }),
                  });
                }}
                onAnimationEnd={() => {}}
                onComplete={() => {
                  stompClient.publish({
                    destination: '/app/games/action',
                    body: JSON.stringify({ roomId, type: 'GOLD_DICE_COMPLETE' }),
                  });
                }}
              />
            )}
            {/* 더블 주사위 효과 */}
            {/* 서버 - 첫번째 주사위, 최종 합계만 계산, 프론트에서 2번째 계산 */}
            {(gameState.status === 'WAITING_DOUBLE_DICE' || gameState.status === 'ROLLING_DOUBLE_DICE') && (
              <DoubleDice
                player={currentPlayer}
                isMyTurn={isMyTurn}
                firstValue={currentPlayer?.actionData}
                secondValue={currentPlayer?.diceValue && currentPlayer?.actionData
                  ? currentPlayer.diceValue - currentPlayer.actionData
                  : null}
                onAction={handleAction}
              />
            )}

            {/* 주사위 굴리기 */}
            {(gameState.status === 'WAITING_DICE' || gameState.status === 'ROLLING_DICE') && (
              <RollDicePage
                currentPlayer={currentPlayer}
                isMyTurn={isMyTurn}
                diceValue={currentPlayer?.diceValue}
                isRolling={gameState.status === 'ROLLING_DICE'}
                onRollComplete={() => {
                  stompClient.publish({
                    destination: '/app/games/roll-dice',
                    body: JSON.stringify({ roomId }),
                  });
                }}
                onAnimationEnd={() => {
                  stompClient.publish({
                    destination: '/app/games/dice-roll-complete',
                    body: JSON.stringify({ roomId }),
                  });
                }}
              />
            )}

            {/* 아이템 사용 인벤 */}
            {gameState.status === 'WAITING_USING_ITEM' && (
              <ItemInventory
                items={currentPlayer?.items}
                isMyTurn={isMyTurn}
                selectedIdx={currentPlayer?.actionData}
                onAction={handleAction}
                onClose={() => handleAction('CLOSE_ITEM_INVENTORY', {})}
              />
            )}

            {/* 집 짓기(하우스) */}
            {gameState.status === 'WAITING_HOUSE' &&
              !inventoryOpen &&
              !atmOpen &&
              !inventoryUsingMemberId &&
              !atmUsingMemberId && (
                <House
                  player={currentPlayer}
                  materialsPlayer={myPlayerState}
                  isMyTurn={isMyTurn}
                  onAction={handleAction}
                  onClose={handleCloseAction}
                  onInventory={() => openInventory('HOUSE')}
                  onATM={() => openAtm('HOUSE')}
                />
              )}

            {/* 무 판매 */}
            {gameState.status === 'WAITING_RADISH_SELL' && (
              <RadishSell
                isMyTurn={isMyTurn}
                player={myPlayerState}
                actorPlayer={currentPlayer}
                currentPlayerName={currentPlayer?.nickname}
                radishPrice={gameState?.radishPrice ?? 0}
                onAction={handleAction}
                onClose={handleCloseAction}
                tradeQty={radishSellResult.qty}
                tradeAmount={radishSellResult.amount}
                tradeMemberId={radishSellResult.memberId}
              />
            )}

            {/* ATM(은행 타일이 아닌 ATM 상태) */}
            {atmOpen && gameState.status !== 'WAITING_LOAN' && (
              <Loan
                isMyTurn={isMyTurn}
                currentPlayerName={currentPlayer?.nickname}
                currentPlayerCharacterId={currentPlayer?.characterId}
                userBell={currentPlayer?.bell || 0}
                userLoan={currentPlayer?.loan || 0}
                timeoutSeconds={gameState.timeoutSeconds || 0}
                onClose={closeAtm}
                onAction={handleAction}
                isBankTile={false}
              />
            )}

            {/* 인벤토리 */}
            {inventoryOpen && <Inventory player={currentPlayer} onClose={closeInventory} />}

            {/* 관전자 대기 중엔 보드 렌더 금지 -> 뒤에 보드판 비침 방지 */}
            {!isLocalOverlayOpen &&
              !isSpectatorWait &&
              ['WAITING_PLAYER_ACTION', 'MOVING'].includes(gameState.status) && (
                <MainBoardPage
                  players={playersArr}
                  movePath={currentPlayer?.movePath}
                  currentPlayerId={gameState.currentPlayerId}
                  onMoveComplete={() => {
                    stompClient.publish({
                      destination: '/app/games/move-complete',
                      body: JSON.stringify({ roomId }),
                    });
                  }}
                />
              )}
          </main>

          {/* 하단 플레이어 상태 패널(순위/집/돈/아이템) */}
          {shouldShowHud && (
            <PlayerStatusPanel
              players={playersArr}
              currentPlayerId={gameState.currentPlayerId}
              myId={myId}
              turnOrder={gameState.turnOrder || []}
            />
          )}
        </div>
      </div>
    </AspectLayout>
  );
};

export default GamePage;
