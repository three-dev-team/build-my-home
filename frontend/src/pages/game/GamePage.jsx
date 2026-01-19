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

const GamePage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const token = sessionStorage.getItem("token");
  // const myId = getMyIdFromToken(); // myId -> 로그인한 유저 아이디
  const myTokenId = getMyIdFromToken();
  const [devMyId, setDevMyId] = useState(null); // [DEV] 테스트용 강제 ID
  const myId = devMyId || myTokenId; // 실전엔 토큰 ID, 테스트엔 Dev ID 사용

  const [gameState, setGameState] = useState(
    location.state?.initialGameData || null,
  );
  const [stompClient, setStompClient] = useState(null);

  // 공통 UI(채팅, 메뉴버튼 등)를 보여줄지 말지 결정하는 변수
  const showCommonUI =
    gameState && !["DETERMINING_ORDER", "FINISHED"].includes(gameState.status);

  // --------------------------------- useEffect --------------------------------- //
  useEffect(() => {
    // 1. 토큰이 없으면 아예 소켓 시도도 하지 않음
    if (!token) {
      alert("로그인이 필요합니다.");
      navigate("/");
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

  // --------------------------------- useEffect --------------------------------- //
  // --------------------------------- 핸들러 함수 --------------------------------- //

  const handleIntroComplete = () => {
    stompClient.publish({
      destination: "/app/games/intro-complete",
      body: JSON.stringify({ roomId: roomId }),
    });
  };

  const handleRollDice = () => {
    if (stompClient) {
      stompClient.publish({
        destination: `/app/games/roll-order`,
        body: JSON.stringify({ roomId: roomId }),
      });
    }
  };

  const handleAction = (actionType, payload) => {
    if (!stompClient) return;
    stompClient.publish({
      destination: "/app/games/action",
      body: JSON.stringify({
        roomId: roomId,
        type: actionType,
        ...payload,
      }),
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
  };
  // ------------------- [DEV] 상태 강제 변경 핸들러 ------------------- //
  // --------------------------------- 핸들러 함수 --------------------------------- //

  if (!gameState) return <Loading />;

  // 현재 턴 플레이어 정보
  const currentPlayer = gameState.players?.find(
    (p) => p.memberId === gameState.currentPlayerId,
  );
  const activePlayerName = currentPlayer?.nickname || "알 수 없음";
  const isActivePlayer = myId === gameState.currentPlayerId;
  const myPlayer = gameState.players?.find((p) => p.memberId === myId); // 내 플레이어 정보

  return (
    <div className="game-container">
      {/* 1. 설정/채팅 버튼은 본 게임 중에만 표시 */}
      {showCommonUI && (
        <div className="game-overlay">
          <MenuButton />
          <ChatToggle />
        </div>
      )}

      {/* 2. 게임 콘텐츠 영역 */}
      <main>
        <DevControls
          onStatusChange={handleDevStatusChange}
          stompClient={stompClient}
          roomId={roomId}
          setGameState={setGameState}
          setDevMyId={setDevMyId}
        />

        {/* INTRO */}
        {gameState.status === "INTRO" && stompClient && (
          <GameIntro onSkip={handleIntroComplete} />
        )}

        {/* 주사위 던져서 순서 정하기 페이지 */}
        {gameState.status === "DETERMINING_ORDER" && stompClient && (
          <RollForOrder
            players={gameState.players}
            myId={myId}
            onRoll={handleRollDice} // 소켓 대신 '할 일'을 넘깁니다.
          />
        )}

        {/* 은행 이벤트 (WAITING_LOAN) */}
        {gameState.status === "WAITING_LOAN" && (
          <Loan
            isActivePlayer={isActivePlayer}
            activePlayerName={activePlayerName}
            userBalance={currentPlayer?.bell || 0} //
            currentLoan={currentPlayer?.loan || 0}
            isBankSquare={true} // TODO: 연동 필요
            onAction={(type, amount, isBankSquare) =>
              handleAction("LOAN_ACTION", { type, amount, isBankSquare })
            }
            // TODO: 은행 이벤트 종료 시점 연동 필요 "LOAN_COMPLETE"
            onExit={() => handleDevStatusChange("WAITING_DICE")}
          />
        )}

        {/* 스탬프 이벤트 (WAITING_STAMP) */}
        {gameState.status === "WAITING_STAMP" && (
          <Stamp
            isActivePlayer={isActivePlayer}
            activePlayerName={activePlayerName}
            initialCount={currentPlayer?.collectedStamps?.length || 0} // TODO: 연동 필요
            onReward={(reward) => console.log(`Reward: ${reward}`)}
            // TODO: 스탬프 이벤트 종료 시점 연동 필요 "STAMP_COMPLETE"
            onExit={() => handleDevStatusChange("WAITING_DICE")}
            onStampClick={() => handleAction("STAMP_ACTION", {})}
          />
        )}

        {gameState.status === "WAITING_DICE" && <MainBoardPage />}
      </main>

      {/* 사용자 패널 표시 */}
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
