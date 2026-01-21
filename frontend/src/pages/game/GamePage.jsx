import { useEffect, useState } from "react";
import { Client } from "@stomp/stompjs";
import { getBrokerURL } from "../../utils/ws.js";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Loading from "../../components/common/Loading.jsx";
import MenuButton from "../../components/common/MenuButton.jsx";
import ChatToggle from "../../components/common/ChatToggle.jsx";
import RollForOrder from "./RollForOrder.jsx";
import { getMyIdFromToken } from "../../utils/auth.js";
import MainBoardPage from "./MainBoardPage.jsx";
import GameIntro from "./GameIntro.jsx";
import PlayerStatusPanel from "./PlayerStatusPanel.jsx";
import DevControls from "./DevControls.jsx";
import Loan from "./Loan.jsx";
import Stamp from "./Stamp.jsx";
import PlayerActionPanel from "./PlayerActionPanel.jsx";
import RollDicePage from "./RollDicePage.jsx";
import KK from "./KK.jsx";
import ShopPage from "./ShopPage.jsx";
import TurnCounter from "./TurnCounter.jsx";
import House from "./House.jsx";
import Fishing from "./Fishing.jsx";
import FixedPlayerButtons from "./FixedPlayerButtons.jsx";

const GamePage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const token = sessionStorage.getItem("token");
  const myTokenId = getMyIdFromToken();
  const [devMyId, setDevMyId] = useState(null); // [DEV] 테스트용 강제 ID
  const myId = devMyId || myTokenId; // 실전엔 토큰 ID, 테스트엔 Dev ID 사용

  const [gameState, setGameState] = useState(
    location.state?.initialGameData || null,
  );
  const [stompClient, setStompClient] = useState(null);

  // fishing 추가: 낚시 룸 이벤트 메시지 분리 저장소
  const [fishingEventMessage, setFishingEventMessage] = useState(null);

  // 현재 턴 플레이어 정보
  const currentPlayer =
    gameState?.players?.find((p) => p.memberId === gameState.currentPlayerId) ||
    null;
  const isMyTurn = gameState ? myId === gameState.currentPlayerId : false;

  // 공통 UI(채팅, 메뉴버튼 등)를 보여줄지 말지 결정하는 변수
  const showCommonUI =
    gameState && !["DETERMINING_ORDER", "FINISHED"].includes(gameState.status);

  // 나의 로직 (집짓기, atm 대출 등) - Feature Branch Logic
  const myPlayer = gameState?.players?.find((p) => p.memberId === myId) || null;
  const [showHousePage, setShowHousePage] = useState(false);
  const [showAtmModal, setShowAtmModal] = useState(false);

  // --------------------------------- useEffect --------------------------------- //
  useEffect(() => {
    // 1. 토큰이 없으면 아예 소켓 시도도 하지 않음
    if (!token) {
      alert("로그인이 필요합니다.");
      navigate("/login");
      return;
    }
  }, [token, navigate]);

  // 1. 소켓 연결 및 데이터 수신 로직은 여기서 한 번만!
  useEffect(() => {
    // stomp 소켓 연결 및 구독 설정
    const client = new Client({
      brokerURL: getBrokerURL(),
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      onConnect: () => {
        console.log(">>> ✅ WebSocket 연결됨");
        setStompClient(client);

        client.subscribe(`/topic/games/${roomId}`, (message) => {
          const data = JSON.parse(message.body);
          console.log(">>> 🔔 메시지 수신:", data);

          // fishing: 룸 이벤트(ROOM_EVENT_*)는 gameState를 덮어쓰지 않게 분리
          const t = data?.type;

          const isRoomEvent =
            typeof t === "string" && t.startsWith("ROOM_EVENT_");
          // ERROR는 낚시 에러만 분리 (다른 ERROR까지 낚시가 먹어버리는 문제 방지)
          const isFishingError =
            t === "ERROR" &&
            typeof data?.eventType === "string" &&
            data.eventType === "FISHING";

          if (isRoomEvent || isFishingError) {
            setFishingEventMessage(data);
            return;
          }

          setGameState(data);
        });

        // 웹소켓 연결 시 현재 게임 상태 요청 - 에러, 새로고침 방지용
        client.publish({
          destination: "/app/games/get-state",
          body: JSON.stringify({ roomId: roomId }),
        });
      },
      onStompError: (frame) => {
        const errorMsg = frame.headers["message"];
        console.error("STOMP 에러:", errorMsg);

        // 유저에게 알림을 띄우고 메인 화면으로 튕기게 처리
        alert("게임 연결에 문제가 발생했습니다: " + errorMsg);
        navigate(`/rooms/${roomId}`);
      },
    });

    client.activate();

    // 컴포넌트 언마운트 시 소켓 연결 해제
    return () => {
      if (client.active) {
        client.deactivate();
        setStompClient(null);
        console.log(">>> ❌ WebSocket 연결 해제됨");
      }
    };
  }, [roomId, token]); // roomId, token이 바뀔 때마다 재실행

  // 이동 후 2초 후에 다음 페이지로 이동
  useEffect(() => {
    if (gameState?.status === "MOVING" && stompClient && isMyTurn) {
      const timer = setTimeout(() => {
        stompClient.publish({
          destination: "/app/games/move-complete",
          body: JSON.stringify({ roomId }),
        });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [gameState?.status, stompClient, isMyTurn, roomId]);

  // --------------------------------- 핸들러 함수 --------------------------------- //

  const handleIntroComplete = () => {
    stompClient.publish({
      destination: "/app/games/intro-complete",
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

    // 내 턴이 아니거나 이동 중일 때는 액션 차단
    if (!isMyTurn || gameState.status === "MOVING") {
      console.warn("내 턴이 아니거나 캐릭터가 이동 중입니다.");
      return;
    }

    stompClient.publish({
      destination: "/app/games/action",
      body: JSON.stringify({
        roomId: roomId,
        type: actionType, // 백엔드에서 구분할 핵심 키
        ...payload, // 추가 데이터 (amount, itemId, diceType 등)
      }),
    });
  };

  const handleEventComplete = () => {
    stompClient.publish({
      destination: "/app/games/event-complete",
      body: JSON.stringify({ roomId }),
    });
    // 낚시 메시지 잔상 방지
    setFishingEventMessage(null);
  };

  // fishing : UI(Fishing)에서 stompClient 직접 쓰지 않게 publish를 상위로 올림
  const handleFishingStart = () => {
    if (!stompClient) return;

    stompClient.publish({
      destination: "/app/games/fishing/start",
      body: JSON.stringify({ roomId: Number(roomId) }),
    });
  };

  const handleFishingAction = (action) => {
    if (!stompClient) return;

    stompClient.publish({
      destination: "/app/games/fishing/action",
      body: JSON.stringify({ roomId: Number(roomId), action }),
    });
  };

  // ------------------- [DEV] 상태 강제 변경 핸들러 ------------------- //
  const handleDevStatusChange = (newStatus) => {
    console.log(`>>> [DEV] Status Change Request: ${newStatus}`);

    // 1. 서버로 요청 (연결된 경우)
    if (stompClient) {
      try {
        stompClient.publish({
          destination: "/app/games/trigger-event",
          body: JSON.stringify({ roomId: Number(roomId), status: newStatus }),
        });
        console.log(">>> [DEV] Server publish sent");
      } catch (e) {
        console.error(">>> [DEV] Server publish failed:", e);
      }
    }

    // 2. 로컬 강제 업데이트
    setGameState((prev) => ({
      ...prev,
      status: newStatus,
    }));

    // 낚시로 강제 진입/테스트 시 메시지 초기화
    if (
      newStatus === "WAITING_FISHING" ||
      newStatus === "FISHING_IN_PROGRESS"
    ) {
      setFishingEventMessage(null);
    }
  };
  // ------------------- [DEV] 상태 강제 변경 핸들러 ------------------- //

  if (!gameState) return <Loading />;

  // 낚시 렌더링 상태 확장 (새로고침/재접속 대비)
  const isFishingPhase =
    ["WAITING_FISHING", "FISHING_IN_PROGRESS"].includes(gameState.status) &&
    stompClient;

  return (
    <div className="game-container">
      {/* 1. 설정/채팅 버튼은 본 게임 중에만 표시 */}
      {showCommonUI && (
        <div className="game-overlay">
          <MenuButton />
          <ChatToggle />
        </div>
      )}
      {/* 2. 턴 카운터 - INTRO, DETERMINING_ORDER 제외하고 표시 */}
      {!["INTRO", "DETERMINING_ORDER", "FINISHED"].includes(
        gameState.status,
      ) && (
        <TurnCounter
          currentRound={gameState.currentRound || 1}
          totalRounds={gameState.totalRounds || 20}
        />
      )}

      {/* 2. 게임 콘텐츠 영역 */}
      <main>
        <DevControls onStatusChange={handleDevStatusChange} />

        {/* INTRO */}
        {gameState.status === "INTRO" && stompClient && (
          <GameIntro onSkip={handleIntroComplete} />
        )}

        {/* 주사위 던져서 순서 정하기 페이지 */}
        {gameState.status === "DETERMINING_ORDER" && stompClient && (
          <RollForOrder
            players={gameState.players}
            myId={myId}
            onRoll={handleRollDiceForOrder}
          />
        )}

        {/* ------------------------------------- 개별 이벤트 추가 ------------------------------------- */}
        {/* 은행 이벤트 (WAITING_LOAN) */}
        {gameState.status === "WAITING_LOAN" && (
          <Loan
            isMyTurn={isMyTurn}
            currentPlayerName={currentPlayer?.nickname}
            userBell={currentPlayer?.bell || 0}
            userLoan={currentPlayer?.loan || 0}
            timeoutSeconds={gameState.timeoutSeconds || 0}
            onExit={handleEventComplete}
            onAction={handleAction}
          />
        )}

        {/* 스탬프 이벤트 (WAITING_STAMP) */}
        {gameState.status === "WAITING_STAMP" && (
          <Stamp
            isMyTurn={isMyTurn}
            currentPlayerName={currentPlayer?.nickname}
            userStampsCount={currentPlayer?.collectedStamps?.length || 0}
            timeoutSeconds={gameState.timeoutSeconds || 0}
            onReward={(reward) => console.log(`Reward: ${reward}`)}
            onStampClick={() => handleAction("STAMP_ACTION", {})}
            onExit={handleEventComplete}
            onAction={handleAction}
          />
        )}

        {/* 낚시 이벤트 (WAITING_FISHING / FISHING_IN_PROGRESS) */}
        {isFishingPhase && (
          <Fishing
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
        {gameState.status === "WAITING_SHOP_ITEM" && (
          <ShopPage
            gameState={gameState}
            myId={myId}
            shopType="ITEM_SHOP"
            handleAction={handleAction}
            onExit={handleEventComplete}
          />
        )}

        {/* 재화 상점 이벤트 (WAITING_SHOP_RESOURCE) - Develop 버전 적용 */}
        {gameState.status === "WAITING_SHOP_RESOURCE" && (
          <ShopPage
            gameState={gameState}
            myId={myId}
            shopType="HARVEST_SHOP"
            handleAction={handleAction}
            onExit={handleEventComplete}
          />
        )}

        {gameState.status === "WAITING_KK" && (
          <KK
            isMyTurn={isMyTurn}
            currentPlayerName={currentPlayer?.nickname}
            userBell={currentPlayer?.bell || 0}
            timeoutSeconds={gameState.timeoutSeconds || 0}
            onAction={(type, payload) => handleAction(type, payload)}
            onExit={handleEventComplete}
          />
        )}
        {/* ------------------------------------- 개별 이벤트 추가 ------------------------------------- */}

        {/* 사용자 액션 패널 - Develop 버전 적용 (항목 추가됨) */}
        {gameState.status === "WAITING_PLAYER_ACTION" && (
          <PlayerActionPanel
            isMyTurn={isMyTurn}
            items={currentPlayer?.items || []}
            onSelectDice={() => {
              stompClient.publish({
                destination: "/app/games/select-dice",
                body: JSON.stringify({ roomId }),
              });
            }}
            onSelectItem={() => console.log("아이템 선택")}
            onSelectMap={() => console.log("맵 선택")}
            onATM={() => console.log("ATM 선택")}
            onBuildHouse={() => {
              stompClient.publish({
                destination: "/app/games/action",
                body: JSON.stringify({ roomId, type: "BUILD_HOUSE" }),
              });
            }}
          />
        )}

        {/* -------------------------------- 사용자 액션 패널 관련 컴포넌트 -------------------------------- */}
        {/* 주사위 굴리는 페이지 */}
        {gameState.status === "WAITING_DICE" && (
          <RollDicePage
            currentPlayer={currentPlayer}
            isMyTurn={isMyTurn}
            onRollComplete={() => {
              stompClient.publish({
                destination: "/app/games/roll-dice",
                body: JSON.stringify({ roomId }),
              });
            }}
          />
        )}

        {/* House 컴포넌트 (Develop에 추가된 WAITING_HOUSE용) */}
        {gameState.status === "WAITING_HOUSE" && (
          <House
            player={currentPlayer}
            isMyTurn={isMyTurn}
            onAction={handleAction}
            onClose={() => handleEventComplete()}
          />
        )}

        {/* 메인 보드 & 상시 버튼 (HEAD 버전 유지 - FixedPlayerButtons) */}
        {["WAITING_PLAYER_ACTION", "MOVING"].includes(gameState.status) && (
          <>
            <MainBoardPage players={gameState.players} />
            <FixedPlayerButtons
              isMyTurn={isMyTurn}
              onATMClick={() => setShowAtmModal(true)}
              onBuildClick={() => setShowHousePage(true)}
            />
          </>
        )}

        {/* ------------------------------------- 상시 버튼 페이지 ------------------------------------- */}
        {/* 마을회관(집짓기) 페이지 */}
        {showHousePage && (
          <House
            player={myPlayer}
            onClose={() => setShowHousePage(false)}
            onUpgrade={() => handleAction("UPGRADE_HOUSE", {})}
          />
        )}

        {/* ATM 모달 (상시) - HEAD 버전 유지 */}
        {showAtmModal && (
          <Loan
            isMyTurn={isMyTurn}
            currentPlayerName={myPlayer?.nickname}
            userBell={myPlayer?.bell || 0}
            userLoan={myPlayer?.loan || 0}
            timeoutSeconds={60} // ATM은 넉넉하게
            onExit={() => setShowAtmModal(false)}
            onAction={handleAction}
            isBankTile={false}
          />
        )}
        {/* ------------------------------------- 상시 버튼 페이지 ------------------------------------- */}
      </main>

      {/* 사용자 상태 패널 표시(하단) */}
      {!["INTRO", "DETERMINING_ORDER"].includes(gameState.status) && (
        <PlayerStatusPanel
          players={gameState.players || []}
          currentPlayerId={gameState.currentPlayerId}
          myId={myId}
        />
      )}
    </div>
  );
};

export default GamePage;
