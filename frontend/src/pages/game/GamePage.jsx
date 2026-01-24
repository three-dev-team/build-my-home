import { useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import { getBrokerURL } from '../../utils/ws.js';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Loading from '../../components/common/Loading.jsx';
import MenuButton from '../../components/common/MenuButton.jsx';
import ChatToggle from '../../components/common/ChatToggle.jsx';
import RollForOrder from './RollForOrder.jsx';
import { getMyIdFromToken } from '../../utils/auth.js';
import MainBoardPage from './MainBoardPage.jsx';
import GameIntro from './GameIntro.jsx';
import PlayerStatusPanel from './PlayerStatusPanel.jsx';
import DevControls from './DevControls.jsx';
import Loan from './Loan.jsx';
import Stamp from './Stamp.jsx';
import PlayerActionPanel from './PlayerActionPanel.jsx';
import RollDicePage from './RollDicePage.jsx';
import KK from './KK.jsx';
import ShopPage from './ShopPage.jsx';
import TurnCounter from './TurnCounter.jsx';
import House from './House.jsx';
import Fishing from './Fishing.jsx';
import Inventory from './Inventory.jsx';
import RewardDrop from './RewardDrop.jsx';
import Start from './Start.jsx';
import Result from './Result.jsx';
import Mupani from './Mupani.jsx';
import Machurilla from './Machurilla/Machurilla.jsx';

const GamePage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const token = sessionStorage.getItem('token');
  const myTokenId = getMyIdFromToken();
  const [devMyId, setDevMyId] = useState(null); // [DEV] 테스트용 강제 ID
  const myId = devMyId || myTokenId; // 실전엔 토큰 ID, 테스트엔 Dev ID 사용

  const [gameState, setGameState] = useState(location.state?.initialGameData || null);
  const [stompClient, setStompClient] = useState(null);

  // fishing: 낚시 룸 이벤트 메시지 분리 저장소
  const [fishingEventMessage, setFishingEventMessage] = useState(null);

  // 인벤토리 오버레이 (내 턴일 때만 열 수 있음)
  const [showInventory, setShowInventory] = useState(false);

  // 재화/과일 드롭 이펙트 트리거 데이터
  const [rewardToast, setRewardToast] = useState(null);
  const rewardCharacterRef = useRef(null);

  // 현재 턴 플레이어 정보
  const currentPlayer = gameState?.players?.find((p) => p.memberId === gameState.currentPlayerId) || null;
  const isMyTurn = gameState ? myId === gameState.currentPlayerId : false;
  const [movePath, setMovePath] = useState([]); // 플레이어 이동 경로 저장소
  // 내 무 보유 개수/썩는 턴 안내용
  const myPlayerState = gameState?.players?.find((p) => Number(p?.memberId) === Number(myId)) || null;

  // 무 썩는 턴 안내 문구 (radishRemoveRound 기준)
  const getRadishDecayGuide = (player, currentRound) => {
    const qty = Number(player?.radishQty ?? 0);
    const removeRound = player?.radishRemoveRound;

    // 무를 보유 중이 아니면 안내 숨김
    if (!qty || qty <= 0) return null;
    if (typeof removeRound !== 'number') return null;
    if (typeof currentRound !== 'number') return null;

    const remain = removeRound - currentRound;

    if (remain >= 2) return `${remain}턴 후에 무가 썩는다구리`;
    if (remain === 1) return '다음턴에 무가 썩는다구리';
    if (remain === 0) return '이번턴에 무가 썩는다구리';
    return '무가 썩었다구리~';
  };

  // 렌더링용 텍스트
  const radishGuideText = getRadishDecayGuide(myPlayerState, gameState?.currentRound);

  // 공통 UI(채팅, 메뉴버튼 등)를 보여줄지 말지 결정하는 변수
  const showCommonUI = gameState && !['DETERMINING_ORDER', 'FINISHED'].includes(gameState.status);

  // --------------------------------- useEffect --------------------------------- //
  useEffect(() => {
    // 1. 토큰이 없으면 아예 소켓 시도도 하지 않음
    if (!token) {
      alert('로그인이 필요합니다.');
      navigate('/login');
      return;
    }
  }, [token, navigate]);

  // 내 턴이 끝나거나 상태가 바뀌면 인벤을 자동으로 닫아서 잔상 방지
  useEffect(() => {
    if (!isMyTurn) setShowInventory(false);
    if (gameState && gameState.status !== 'WAITING_PLAYER_ACTION') {
      setShowInventory(false);
    }
  }, [isMyTurn, gameState?.status]);

  // 1. 소켓 연결 및 데이터 수신 로직은 여기서 한 번만!
  useEffect(() => {
    // stomp 소켓 연결 및 구독 설정
    const client = new Client({
      brokerURL: getBrokerURL(),
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      onConnect: () => {
        console.log('>>> ✅ WebSocket 연결됨');
        setStompClient(client);

        client.subscribe(`/topic/games/${roomId}`, (message) => {
          const data = JSON.parse(message.body);
          console.log('>>> 🔔 메시지 수신:', data);

          // fishing: 룸 이벤트(ROOM_EVENT_*)는 gameState를 덮어쓰지 않게 분리
          const t = data?.type;

          const isRoomEvent = typeof t === 'string' && t.startsWith('ROOM_EVENT_');
          // ERROR는 낚시 에러만 분리 (다른 ERROR까지 낚시가 먹어버리는 문제 방지)
          const isFishingError = t === 'ERROR' && typeof data?.eventType === 'string' && data.eventType === 'FISHING';

          if (isRoomEvent || isFishingError) {
            setFishingEventMessage(data);
            return;
          }

          //  보상 데이터는 (현재 구현상) MOVE_COMPLETE에 들어오는 것으로 가정
          // - 여기서 rewardFx를 세팅해두고
          // - 실제 렌더는 WAITING_RESOURCES/HARVEST 상태일 때만 한다(진행 멈춤 보장)
          if (data?.type === 'MOVE_COMPLETE') {
            const hasRes = data?.gainedResources && Object.keys(data.gainedResources).length > 0;
            const hasHar = data?.gainedHarvests && Object.keys(data.gainedHarvests).length > 0;

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

        // [중복 로그인 실시간 감지]
        client.subscribe('/user/queue/kick', (message) => {
          console.log('>>> 🚫 중복 로그인 감지: 강제 로그아웃');
          alert('다른 기기에서 접속하여 로그아웃 되었습니다.');
          sessionStorage.clear();
          localStorage.clear();
          navigate('/');
        });

        // 웹소켓 연결 시 현재 게임 상태 요청 - 에러, 새로고침 방지용
        client.publish({
          destination: '/app/games/get-state',
          body: JSON.stringify({ roomId: roomId }),
        });
      },
      onStompError: (frame) => {
        const errorMsg = frame.headers['message'];
        console.error('STOMP 에러:', errorMsg);

        // 유저에게 알림을 띄우고 메인 화면으로 튕기게 처리
        alert('게임 연결에 문제가 발생했습니다: ' + errorMsg);
        navigate(`/rooms/${roomId}`);
      },
    });

    client.activate();

    // 컴포넌트 언마운트 시 소켓 연결 해제
    return () => {
      if (client.active) {
        client.deactivate();
        setStompClient(null);
        console.log('>>> ❌ WebSocket 연결 해제됨');
      }
    };
  }, [roomId, token]); // roomId, token이 바뀔 때마다 재실행

  // --------------------------------- 핸들러 함수 --------------------------------- //

  const handleIntroComplete = () => {
    stompClient.publish({
      destination: '/app/games/intro-complete',
      body: JSON.stringify({ roomId: roomId }),
    });
  };

  const handleRollDiceForOrder = () => {
    if (stompClient) {
      stompClient.publish({
        destination: `/app/games/roll-order`,
        body: JSON.stringify({ roomId: roomId }),
      });
    }
  };

  const handleAction = (actionType, payload) => {
    if (!stompClient) return;

    // MUPANI: 무파니칸에서는 BUY/SKIP만 턴 무관 허용(전원 동시 결정)
    const allowAnyPlayerAction =
      gameState?.status === 'WAITING_MUPANI' && ['RADISH_BUY', 'RADISH_SKIP'].includes(actionType);

    // 내 턴이 아니면 차단(단, 무파니 BUY/SKIP은 예외)
    // + MOVING 중에는 항상 차단
    if ((!isMyTurn && !allowAnyPlayerAction) || gameState.status === 'MOVING') {
      console.warn('내 턴이 아니거나 캐릭터가 이동 중입니다.');
      return;
    }

    stompClient.publish({
      destination: '/app/games/action',
      body: JSON.stringify({
        roomId: roomId,
        type: actionType, // 백엔드에서 구분할 핵심 키
        ...payload, // 추가 데이터 (amount, itemId, diceType 등)
      }),
    });
  };

  // 사용자 액션 패널 닫기 핸들러 (WAITING_PLAYER_ACTION)
  const handleCloseAction = () => {
    if (!stompClient || !isMyTurn) return; // 내 턴 확인 추가

    stompClient.publish({
      destination: '/app/games/action',
      body: JSON.stringify({ roomId, type: 'CLOSE_ACTION' }),
    });
  };

  // 이벤트 종료(다음턴으로 넘어감) 핸들러
  const handleEventComplete = () => {
    stompClient.publish({
      destination: '/app/games/event-complete',
      body: JSON.stringify({ roomId }),
    });
    // 낚시 메시지 잔상 방지
    setFishingEventMessage(null);
  };

  // fishing : UI(Fishing)에서 stompClient 직접 쓰지 않게 publish를 상위로 올림
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

  // MUPANI: buy/skip 핸들러(기존 handleAction 재사용)
  const handleMupaniBuy = (qty) => handleAction('RADISH_BUY', { quantity: qty });
  const handleMupaniSkip = () => handleAction('RADISH_SKIP', {});

  // 인벤 열기: 내 턴에서만 허용
  const handleOpenInventory = () => {
    if (!isMyTurn) return;
    if (!gameState || gameState.status !== 'WAITING_PLAYER_ACTION') return;
    setShowInventory(true);
  };

  const handleCloseInventory = () => {
    setShowInventory(false);
  };

  // ------------------- [DEV] 상태 강제 변경 핸들러 ------------------- //
  const handleDevStatusChange = (newStatus) => {
    console.log(`>>> [DEV] Status Change Request: ${newStatus}`);

    // 1. 서버로 요청 (연결된 경우)
    if (stompClient) {
      try {
        stompClient.publish({
          destination: '/app/games/trigger-event',
          body: JSON.stringify({ roomId: Number(roomId), status: newStatus }),
        });
        console.log('>>> [DEV] Server publish sent');
      } catch (e) {
        console.error('>>> [DEV] Server publish failed:', e);
      }
    }

    // 2. 로컬 강제 업데이트
    setGameState((prev) => ({
      ...prev,
      status: newStatus,
    }));

    // 낚시로 강제 진입/테스트 시 메시지 초기화
    if (newStatus === 'WAITING_FISHING' || newStatus === 'FISHING_IN_PROGRESS') {
      setFishingEventMessage(null);
    }
  };

  // [DEV] 현재 라운드를 강제로 마지막 라운드로 변경
  const handleSetLastRound = () => {
    if (!stompClient || !gameState) return;

    console.log('>>> [DEV] Force setting to Last Round');
    stompClient.publish({
      destination: '/app/games/set-round',
      body: JSON.stringify({
        roomId: Number(roomId),
        currentRound: gameState.totalRounds, // 마지막 라운드로 설정
      }),
    });
  };

  const handleLeaveRoom = () => {
    if (!stompClient) return;
    console.log('>>> 🚪 Explicit Leave Room Triggered');
    stompClient.publish({
      destination: '/app/roomlist/rooms/leave',
      body: JSON.stringify({ roomId: Number(roomId) }),
    });
  };
  // ------------------- [DEV] 상태 강제 변경 핸들러 ------------------- //

  if (!gameState) return <Loading />;

  // 낚시 렌더링 상태 확장 (새로고침/재접속 대비)
  const isFishingPhase = ['WAITING_FISHING', 'FISHING_IN_PROGRESS'].includes(gameState.status) && stompClient;

  return (
    <div className="game-container">
      {/* 무 시세: 플레이어 패널(보드판 시작)과 동일 타이밍부터만 상단 표시 */}
      {!['INTRO', 'DETERMINING_ORDER'].includes(gameState.status) && (
        <div
          style={{
            position: 'fixed',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 13000,
            background: 'rgba(255,255,255,0.92)',
            borderRadius: 999,
            padding: '10px 16px',
            boxShadow: '0 8px 18px rgba(0,0,0,0.18)',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          <span style={{ fontWeight: 500, marginRight: 10, fontSize: 20 }}>🥬 무 시세</span>
          <span style={{ fontWeight: 800, fontSize: 20 }}>
            {typeof gameState.radishPrice === 'number' ? `${gameState.radishPrice}벨` : '-'}
          </span>
          {Number(myPlayerState?.radishQty ?? 0) > 0 && (
            <span style={{ fontWeight: 800, marginLeft: 10, fontSize: 18 }}>· 보유 {myPlayerState.radishQty}개</span>
          )}

          {radishGuideText && (
            <span style={{ fontWeight: 700, marginLeft: 10, fontSize: 16, opacity: 0.85 }}>({radishGuideText})</span>
          )}
        </div>
      )}

      {/* 1. 설정/채팅 버튼은 본 게임 중에만 표시 */}
      {showCommonUI && (
        <div className="game-overlay">
          <MenuButton />
          <ChatToggle />
        </div>
      )}
      {/* 2. 턴 카운터 - INTRO, DETERMINING_ORDER 제외하고 표시 */}
      {!['INTRO', 'DETERMINING_ORDER', 'FINISHED'].includes(gameState.status) && (
        <TurnCounter currentRound={gameState.currentRound || 1} totalRounds={gameState.totalRounds || 20} />
      )}

      {/* MUPANI: WAITING_MUPANI에서만 렌더 */}
      <Mupani gameState={gameState} myId={myId} onBuy={handleMupaniBuy} onSkip={handleMupaniSkip} />

      {/* 인벤토리 오버레이: 내 턴 + WAITING_PLAYER_ACTION에서만 표시 */}
      {showInventory && isMyTurn && gameState.status === 'WAITING_PLAYER_ACTION' && (
        <Inventory player={currentPlayer} onClose={handleCloseInventory} />
      )}

      {/* 보상 연출용 캐릭터(보드 말판 말고, 화면에 따로 띄우는 용도) */}
      {rewardToast && (gameState.status === 'WAITING_RESOURCES' || gameState.status === 'WAITING_HARVEST') && (
        <div
          ref={rewardCharacterRef}
          style={{
            position: 'fixed',
            left: '50%',
            top: 220,
            transform: 'translateX(-50%)',
            zIndex: 12000,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          <img
            src="/images/RewardCharater.webp"
            alt="reward-character"
            draggable={false}
            style={{
              width: 220,
              height: 220,
              objectFit: 'contain',
              filter: 'drop-shadow(0 12px 18px rgba(0,0,0,0.25))',
            }}
          />
        </div>
      )}

      {/* 2. 게임 콘텐츠 영역 */}
      <main>
        <DevControls onStatusChange={handleDevStatusChange} onSetLastRound={handleSetLastRound} />

        {/* INTRO */}
        {gameState.status === 'INTRO' && stompClient && <GameIntro onSkip={handleIntroComplete} />}

        {/* 주사위 던져서 순서 정하기 페이지 */}
        {gameState.status === 'DETERMINING_ORDER' && stompClient && (
          <RollForOrder players={gameState.players} myId={myId} onRoll={handleRollDiceForOrder} />
        )}

        {/* ------------------------------------- 개별 이벤트 추가 ------------------------------------- */}
        {/* 은행 이벤트 (WAITING_LOAN) */}
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

        {/* 스탬프 이벤트 (WAITING_STAMP) */}
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

        {/* 낚시 이벤트 (WAITING_FISHING / FISHING_IN_PROGRESS) */}
        {isFishingPhase && (
          <Fishing
            // 이전 결과(resultMsg)가 Fishing 컴포넌트 state에 남아있지 않게 확실하게 제거
            key={`${roomId}-${gameState.currentRound}-${gameState.currentPlayerId}`} //
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

        {/* 아이템 상점 이벤트 (WAITING_SHOP_ITEM) - Develop 버전 적용 */}
        {gameState.status === 'WAITING_SHOP_ITEM' && (
          <ShopPage
            gameState={gameState}
            currentPlayer={currentPlayer}
            myId={myId}
            shopType="ITEM_SHOP"
            handleAction={handleAction}
            onExit={handleEventComplete}
            timeoutSeconds={gameState.timeoutSeconds || 0}
          />
        )}

        {/* 재화 상점 이벤트 (WAITING_SHOP_RESOURCE) - Develop 버전 적용 */}
        {gameState.status === 'WAITING_SHOP_RESOURCE' && (
          <ShopPage
            gameState={gameState}
            currentPlayer={currentPlayer}
            myId={myId}
            shopType="HARVEST_SHOP"
            handleAction={handleAction}
            onExit={handleEventComplete}
            timeoutSeconds={gameState.timeoutSeconds || 0}
          />
        )}

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

        {/* 재화칸 && 과일칸 */}
        {rewardToast && (gameState.status === 'WAITING_RESOURCES' || gameState.status === 'WAITING_HARVEST') && (
          <RewardDrop
            key={rewardToast.key}
            anchorRef={rewardCharacterRef}
            gainedResources={rewardToast.gainedResources}
            gainedHarvests={rewardToast.gainedHarvests}
            durationMs={1200}
            onDone={() => {
              setRewardToast(null);

              // 이벤트 종료는 "내 턴"인 클라만 서버에 알림(중복 전송 방지)
              if (isMyTurn) {
                handleEventComplete();
              }
            }}
          />
        )}
        {/* 시작칸 (스탬프 정산칸) */}
        {gameState.status === 'WAITING_START' && (
          <Start
            isMyTurn={isMyTurn}
            player={currentPlayer}
            currentPlayerName={currentPlayer?.nickname}
            onAction={handleAction}
            onExit={handleEventComplete}
          />
        )}

        {/* 마추릴라 이벤트 */}
        {gameState.status === 'WAITING_MACHURILLA' && (
          <Machurilla
            isMyTurn={isMyTurn}
            player={currentPlayer}
            currentPlayerName={currentPlayer?.nickname}
            onAction={handleAction}
            onExit={handleEventComplete}
          />
        )}

        {/* 결과 페이지 */}
        {gameState.status === 'FINISHED' && <Result gameState={gameState} myId={myId} onLeave={handleLeaveRoom} />}

        {/* ------------------------------------- 개별 이벤트 추가 ------------------------------------- */}

        {/* 사용자 액션 패널 */}
        {gameState.status === 'WAITING_PLAYER_ACTION' && (
          <PlayerActionPanel
            isMyTurn={isMyTurn}
            items={currentPlayer?.items || []}
            onSelectDice={() => {
              stompClient.publish({
                destination: '/app/games/select-dice',
                body: JSON.stringify({ roomId }),
              });
            }}
            onSelectItem={() => console.log('아이템 선택')}
            onSelectMap={() => console.log('맵 선택')}
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
            onInventory={handleOpenInventory}
          />
        )}

        {/* -------------------------------- 사용자 액션 패널 관련 컴포넌트 -------------------------------- */}
        {/* 주사위 굴리는 페이지 */}
        {/*WAITING_DICE: 스페이스바 대기*/}
        {/*ROLLING_DICE: 3D 애니메이션 + 결과 화면*/}
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

        {/* House 컴포넌트 */}
        {gameState.status === 'WAITING_HOUSE' && (
          <House player={currentPlayer} isMyTurn={isMyTurn} onAction={handleAction} onClose={handleCloseAction} />
        )}

        {/* ATM 컴포넌트 */}
        {gameState.status === 'WAITING_ATM' && (
          <Loan
            isMyTurn={isMyTurn}
            currentPlayerName={currentPlayer?.nickname}
            userBell={currentPlayer?.bell || 0}
            userLoan={currentPlayer?.loan || 0}
            timeoutSeconds={60} // ATM은 넉넉하게
            onClose={handleCloseAction}
            onAction={handleAction}
            isBankTile={false}
          />
        )}
        {/* -------------------------------- 사용자 액션 패널 관련 컴포넌트 -------------------------------- */}
        {/* 메인 보드 */}
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

      {/* 사용자 상태 패널 표시(하단) */}
      {!['INTRO', 'DETERMINING_ORDER'].includes(gameState.status) && (
        <PlayerStatusPanel players={gameState.players || []} currentPlayerId={gameState.currentPlayerId} myId={myId} />
      )}
    </div>
  );
};

export default GamePage;
