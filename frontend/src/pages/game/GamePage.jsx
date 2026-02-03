import { useEffect, useState } from 'react';
import { Client } from '@stomp/stompjs';
import { getBrokerURL } from '../../utils/ws.js';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import AspectLayout from '../../components/layout/AspectLayout.jsx';
import Loading from '../../components/common/Loading.jsx';
import MenuButton from '../../components/common/MenuButton.jsx';
import ChatToggle from '../../components/common/ChatToggle.jsx';
import RollForOrder from './RollForOrder.jsx';
import { getMyIdFromToken } from '../../utils/auth.js';
import MainBoardPage from './MainBoardPage.jsx';
import GameIntro from './GameIntro.jsx';
import PlayerStatusPanel from './PlayerStatusPanel.jsx';
import Loan from './Loan.jsx';
import Stamp from './Stamp.jsx';
import PlayerActionPanel from './PlayerActionPanel.jsx';
import RollDicePage from './RollDicePage.jsx';
import KK from './KK.jsx';
import ShopPage from './ShopPage.jsx';
import TurnCounter from './TurnCounter.jsx';
import House from './house/House.jsx';
import Fishing from './Fishing.jsx';
import Inventory from './Inventory.jsx';
import RewardTile from './rewardTile/RewardTile.jsx';
import Start from './Start.jsx';
import Result from './Result.jsx';
import Mupani from './Mupani.jsx';
import Machurilla from './Machurilla/Machurilla.jsx';
import Swap from './Swap.jsx';
import PlayerSkipped from './PlayerSkipped.jsx';
import ItemTile from './ItemTile/ItemTile.jsx';
import ItemInventory from './ItemInventory.jsx';
import Pipe from './itemEffect/Pipe.jsx';
import Mirror from './itemEffect/Mirror.jsx';
import RadishSell from './RadishSell.jsx';

import './css/GamePage.css';
import MyCharacterPanel from './MyCharacterPanel.jsx';

const GamePage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const token = sessionStorage.getItem('token');

  const myId = getMyIdFromToken();

  const [gameState, setGameState] = useState(location.state?.initialGameData || null);
  const [stompClient, setStompClient] = useState(null);

  // 낚시: ROOM_EVENT_* 메시지를 gameState와 분리 저장
  const [fishingEventMessage, setFishingEventMessage] = useState(null);

  // 재화/과일 드롭 이펙트 트리거 데이터
  const [rewardToast, setRewardToast] = useState(null);

  // 상점 relay 메시지 저장
  const [shopRelay, setShopRelay] = useState(null);

  // 현재 턴 플레이어 / 내 턴 여부
  const currentPlayer =
    gameState?.players?.find((p) => p.memberId === gameState.currentPlayerId) || null;
  const isMyTurn = gameState ? myId === gameState.currentPlayerId : false;

  // 내 무 보유 개수/썩는 턴 안내용
  const myPlayerState =
    gameState?.players?.find((p) => Number(p?.memberId) === Number(myId)) || null;

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

  // 공통 UI(채팅/메뉴 버튼 등) 노출 여부
  const showCommonUI = gameState && !['DETERMINING_ORDER', 'FINISHED'].includes(gameState.status);

  // 보드에서만 HUD 보이기(= WAITING_PLAYER_ACTION / MOVING)
  const status = gameState?.status;
  const isBoardScene = status === 'WAITING_PLAYER_ACTION' || status === 'MOVING';
  const shouldShowHud = !!gameState && isBoardScene;

  // 로그인 체크
  useEffect(() => {
    if (!token) {
      alert('로그인이 필요합니다.');
      navigate('/login');
    }
  }, [token, navigate]);

  // 상점 상태가 아니면 relay 초기화
  useEffect(() => {
    if (gameState?.status !== 'WAITING_SHOP') {
      setShopRelay(null);
    }
  }, [gameState?.status]);

  // 소켓 연결/구독 및 초기 상태 요청
  useEffect(() => {
    const client = new Client({
      brokerURL: getBrokerURL(),
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      onConnect: () => {
        console.log('>>> ✅ WebSocket 연결됨');
        setStompClient(client);

        // 게임 토픽 구독: 게임 상태 / 이벤트 메시지 수신
        client.subscribe(`/topic/games/${roomId}`, (message) => {
          const data = JSON.parse(message.body);
          console.log('>>> 🔔 메시지 수신:', data);

          const t = data?.type;

          // 낚시: ROOM_EVENT_* 및 낚시 ERROR는 gameState로 덮어쓰지 않고 분리 저장
          const isRoomEvent = typeof t === 'string' && t.startsWith('ROOM_EVENT_');
          const isFishingError =
            t === 'ERROR' && typeof data?.eventType === 'string' && data.eventType === 'FISHING';

          if (isRoomEvent || isFishingError) {
            setFishingEventMessage(data);
            return;
          }

          // 상점: 선택 relay 메시지 저장/초기화
          if (t === 'SHOP_SELECT_RELAY') {
            setShopRelay(data);
            return;
          }
          if (t === 'SHOP_SELECT_CLEAR') {
            setShopRelay(null);
            return;
          }

          // 보상 데이터(MOVE_COMPLETE로 들어오는 것으로 가정)
          if (t === 'MOVE_COMPLETE') {
            const hasRes =
              data?.gainedResources && Object.keys(data.gainedResources).length > 0;
            const hasHar =
              data?.gainedHarvests && Object.keys(data.gainedHarvests).length > 0;

            if (hasRes || hasHar) {
              setRewardToast({
                gainedResources: hasRes ? data.gainedResources : null,
                gainedHarvests: hasHar ? data.gainedHarvests : null,
                key: Date.now(),
              });
            }
          }

          setGameState(data);
        });

        // 중복 로그인 감지: 킥 메시지 수신 시 강제 로그아웃
        client.subscribe('/user/queue/kick', () => {
          console.log('>>> 🚫 중복 로그인 감지: 강제 로그아웃');
          alert('다른 기기에서 접속하여 로그아웃 되었습니다.');
          sessionStorage.clear();
          localStorage.clear();
          navigate('/');
        });

        // 웹소켓 연결 직후: 현재 게임 상태 요청
        client.publish({
          destination: '/app/games/get-state',
          body: JSON.stringify({ roomId: roomId }),
        });
      },
      onStompError: (frame) => {
        const errorMsg = frame.headers['message'];
        console.error('STOMP 에러:', errorMsg);

        alert('게임 연결에 문제가 발생했습니다: ' + errorMsg);
        navigate(`/rooms/${roomId}`);
      },
    });

    client.activate();

    return () => {
      if (client.active) {
        client.deactivate();
        setStompClient(null);
        console.log('>>> ❌ WebSocket 연결 해제됨');
      }
    };
  }, [roomId, token, navigate]);

  // 인트로 종료
  const handleIntroComplete = () => {
    if (!stompClient) return;
    stompClient.publish({
      destination: '/app/games/intro-complete',
      body: JSON.stringify({ roomId: roomId }),
    });
  };

  // 순서 정하기 주사위
  const handleRollDiceForOrder = () => {
    if (!stompClient) return;
    stompClient.publish({
      destination: `/app/games/roll-order`,
      body: JSON.stringify({ roomId: roomId }),
    });
  };

  // 공통 액션 전송
  const handleAction = (actionType, payload) => {
    if (!stompClient) return;

    // 무파니: BUY/SKIP은 턴 무관(전원 동시 결정)
    const allowAnyPlayerAction =
      gameState?.status === 'WAITING_MUPANI' &&
      ['RADISH_BUY', 'RADISH_SKIP'].includes(actionType);

    // 내 턴이 아니면 차단(단, 무파니 BUY/SKIP 예외) / MOVING 중에는 항상 차단
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

  // 액션 패널 닫기(WAITING_PLAYER_ACTION)
  const handleCloseAction = () => {
    if (!stompClient || !isMyTurn) return;

    stompClient.publish({
      destination: '/app/games/action',
      body: JSON.stringify({ roomId, type: 'CLOSE_ACTION' }),
    });
  };

  // 이벤트 종료(다음 턴으로)
  const handleEventComplete = () => {
    if (!stompClient) return;

    stompClient.publish({
      destination: '/app/games/event-complete',
      body: JSON.stringify({ roomId }),
    });

    // 낚시 이벤트 메시지 잔상 방지
    setFishingEventMessage(null);
  };

  // 낚시 시작/액션 전송
  const handleFishingStart = () => {
    if (!stompClient) return;

    stompClient.publish({
      destination: '/app/games/fishing/start',
      body: JSON.stringify({ roomId: Number(roomId) }),
    });
  };

  const handleFishingAction = (action) => {
    if (!stompClient) return;

    stompClient.publish({
      destination: '/app/games/fishing/action',
      body: JSON.stringify({ roomId: Number(roomId), action }),
    });
  };

  // 무파니: buy/skip
  const handleMupaniBuy = (qty) => handleAction('RADISH_BUY', { quantity: qty });
  const handleMupaniSkip = () => handleAction('RADISH_SKIP', {});

  // 방 나가기(룸리스트 leave publish)
  const handleLeaveRoom = () => {
    if (!stompClient) return;
    console.log('>>> 🚪 Explicit Leave Room Triggered');
    stompClient.publish({
      destination: '/app/roomlist/rooms/leave',
      body: JSON.stringify({ roomId: Number(roomId) }),
    });
  };

  if (!gameState) {
    return (
      <AspectLayout>
        <div className="game-root">
          <Loading />
        </div>
      </AspectLayout>
    );
  }

  // 낚시 렌더링 상태(새로고침/재접속 대비)
  const isFishingPhase =
    ['WAITING_FISHING', 'FISHING_IN_PROGRESS'].includes(gameState.status) && stompClient;

  return (
    <AspectLayout>
      <div className="game-root">
        <div className="game-bg" aria-hidden="true" />

        <div className="game-stage">
          {/* 공통 UI 오버레이(현재는 비활성 상태) */}
          {/* {showCommonUI && (
            <div className="game-overlay">
              <MenuButton />
              <ChatToggle />
            </div>
          )} */}

          {/* 보드에서만 라운드/무 시세 표시 */}
          {shouldShowHud && (
            <TurnCounter
              currentRound={gameState.currentRound || 1}
              totalRounds={gameState.totalRounds || 20}
              radishPrice={gameState.radishPrice}
              radishQty={Number(myPlayerState?.radishQty ?? 0)}
              radishGuideText={radishGuideText}
            />
          )}

          {/* 보드에서만 좌측 HUD */}
          {shouldShowHud && (
            <div className="left-hud">
              {/* PlayerActionPanel은 '내 차례 + WAITING_PLAYER_ACTION'일 때만 */}
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
                  onATM={() => {
                    stompClient.publish({
                      destination: '/app/games/action',
                      body: JSON.stringify({ roomId, type: 'OPEN_ATM' }),
                    });
                  }}
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
                  onInventory={() => {
                    stompClient.publish({
                      destination: '/app/games/action',
                      body: JSON.stringify({ roomId, type: 'OPEN_INVENTORY' }),
                    });
                  }}
                  itemUsed={currentPlayer?.itemUsed}
                  radishQty={Number(myPlayerState?.radishQty ?? 0)}
                />
              ) : (
                <div className="left-hud-action-spacer" aria-hidden="true" />
              )}

              <MyCharacterPanel
                players={gameState.players || []}
                myId={myId}
                currentPlayer={currentPlayer}
              />
            </div>
          )}

          {/* 무파니 UI(상태에 따라 내부에서 표시/비표시) */}
          <Mupani gameState={gameState} myId={myId} onBuy={handleMupaniBuy} onSkip={handleMupaniSkip} />

          <main className="game-main">
            {/* INTRO */}
            {gameState.status === 'INTRO' && stompClient && <GameIntro onSkip={handleIntroComplete} />}

            {/* DETERMINING_ORDER */}
            {gameState.status === 'DETERMINING_ORDER' && stompClient && (
              <RollForOrder players={gameState.players} myId={myId} onRoll={handleRollDiceForOrder} />
            )}

            {/* PLAYER_SKIPPED */}
            {gameState.status === 'PLAYER_SKIPPED' && (
              <PlayerSkipped isMyTurn={isMyTurn} player={currentPlayer} onExit={handleEventComplete} />
            )}

            {/* WAITING_LOAN */}
            {gameState.status === 'WAITING_LOAN' && (
              <Loan
                player={currentPlayer}
                isMyTurn={isMyTurn}
                currentPlayerName={currentPlayer?.nickname}
                userBell={currentPlayer?.bell || 0}
                userLoan={currentPlayer?.loan || 0}
                timeoutSeconds={gameState.timeoutSeconds || 0}
                onExit={handleEventComplete}
                onAction={handleAction}
                isBankTile={true}
              />
            )}

            {/* WAITING_STAMP */}
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

            {/* WAITING_FISHING / FISHING_IN_PROGRESS */}
            {isFishingPhase && (
              <Fishing
                key={`${roomId}-${gameState.currentRound}-${gameState.currentPlayerId}`}
                roomId={roomId}
                isMyTurn={isMyTurn}
                currentPlayerName={currentPlayer?.nickname}
                timeoutSeconds={gameState.timeoutSeconds || 0}
                eventMessage={fishingEventMessage}
                onExit={handleEventComplete}
                onStartFishing={handleFishingStart}
                onFishingAction={handleFishingAction}
              />
            )}

            {/* WAITING_SHOP */}
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

            {/* WAITING_KK */}
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

            {/* WAITING_RESOURCES / WAITING_HARVEST */}
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

            {/* WAITING_SWAP */}
            {gameState.status === 'WAITING_SWAP' && (
              <div style={{ pointerEvents: isMyTurn ? 'auto' : 'none' }}>
                <Swap
                  isMyTurn={isMyTurn}
                  player={currentPlayer}
                  resultText={gameState?.actionDataStr}
                  onConfirm={() => handleAction('SWAP_CONFIRM', {})}
                  onExit={handleEventComplete}
                />
              </div>
            )}

            {/* WAITING_START */}
            {gameState.status === 'WAITING_START' && (
              <Start
                isMyTurn={isMyTurn}
                player={currentPlayer}
                currentPlayerName={currentPlayer?.nickname}
                onAction={handleAction}
                onExit={handleEventComplete}
              />
            )}

            {/* WAITING_MACHURILLA */}
            {gameState.status === 'WAITING_MACHURILLA' && (
              <Machurilla
                isMyTurn={isMyTurn}
                player={currentPlayer}
                currentPlayerName={currentPlayer?.nickname}
                onAction={handleAction}
                onExit={handleEventComplete}
              />
            )}

            {/* WAITING_ITEMS */}
            {gameState.status === 'WAITING_ITEMS' && (
              <ItemTile
                gameState={gameState}
                myId={myId}
                isMyTurn={isMyTurn}
                onAction={handleAction}
                onExit={handleEventComplete}
              />
            )}

            {/* FINISHED */}
            {gameState.status === 'FINISHED' && (
              <Result gameState={gameState} myId={myId} roomId={roomId} onLeave={handleLeaveRoom} />
            )}

            {/* WAITING_PIPE */}
            {gameState.status === 'WAITING_PIPE' && (
              <Pipe isMyTurn={isMyTurn} actionDataStr={currentPlayer?.actionDataStr} onAction={handleAction} />
            )}

            {/* WAITING_MIRROR */}
            {gameState.status === 'WAITING_MIRROR' && (
              <Mirror
                isMyTurn={isMyTurn}
                actionDataStr={currentPlayer?.actionDataStr}
                players={gameState.players}
                onAction={handleAction}
              />
            )}

            {/* WAITING_DICE / ROLLING_DICE */}
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

            {/* WAITING_USING_ITEM */}
            {gameState.status === 'WAITING_USING_ITEM' && (
              <ItemInventory
                items={currentPlayer?.items}
                isMyTurn={isMyTurn}
                selectedIdx={currentPlayer?.actionData}
                onAction={handleAction}
                onClose={() => handleAction('CLOSE_ITEM_INVENTORY', {})}
              />
            )}

            {/* WAITING_HOUSE */}
            {gameState.status === 'WAITING_HOUSE' && (
              <House
                player={currentPlayer}
                isMyTurn={isMyTurn}
                onAction={handleAction}
                onClose={handleCloseAction}
                onInventory={() => handleAction('OPEN_INVENTORY', {})}
                onATM={() => handleAction('OPEN_ATM', {})}
              />
            )}

            {/* WAITING_RADISH_SELL */}
            {gameState.status === 'WAITING_RADISH_SELL' && (
              <RadishSell
                isMyTurn={isMyTurn}
                player={currentPlayer}
                currentPlayerName={currentPlayer?.nickname}
                radishPrice={gameState?.radishPrice ?? 0}
                onAction={handleAction}
                onClose={handleCloseAction}
              />
            )}

            {/* WAITING_ATM */}
            {gameState.status === 'WAITING_ATM' && (
              <Loan
                isMyTurn={isMyTurn}
                currentPlayerName={currentPlayer?.nickname}
                userBell={currentPlayer?.bell || 0}
                userLoan={currentPlayer?.loan || 0}
                timeoutSeconds={gameState.timeoutSeconds || 0}
                onClose={() => handleAction('CLOSE_ATM', {})}
                onAction={handleAction}
                isBankTile={false}
              />
            )}

            {/* WAITING_INVENTORY */}
            {gameState.status === 'WAITING_INVENTORY' && (
              <Inventory
                player={currentPlayer}
                onClose={() => handleAction('CLOSE_INVENTORY', {})}
              />
            )}

            {/* 메인 보드(WAITING_PLAYER_ACTION, MOVING) */}
            {['WAITING_PLAYER_ACTION', 'MOVING'].includes(gameState.status) && (
              <MainBoardPage
                players={Object.values(gameState.players)}
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

          {/* 보드에서만 하단 플레이어 상태 패널 */}
          {shouldShowHud && (
            <PlayerStatusPanel players={gameState.players || []} currentPlayerId={gameState.currentPlayerId} myId={myId} />
          )}
        </div>
      </div>
    </AspectLayout>
  );
};

export default GamePage;
