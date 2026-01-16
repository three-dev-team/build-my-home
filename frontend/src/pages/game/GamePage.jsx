import {useEffect, useState} from "react";
import {Client} from "@stomp/stompjs";
import {getBrokerURL} from "../../utils/ws.js";
import {useLocation, useNavigate, useParams} from "react-router-dom";
import Loading from "../../components/common/Loading.jsx";
import MenuButton from "../../components/common/MenuButton.jsx";
import ChatToggle from "../../components/common/ChatToggle.jsx";
import RollForOrder from "./RollForOrder.jsx";
import { getMyIdFromToken } from "../../utils/auth.js";
import MainBoardPage from "./MainBoardPage.jsx";
import GameIntro from "./GameIntro.jsx";
import PlayerStatusPanel from "./PlayerStatusPanel.jsx";
import Loan from "./Loan.jsx";
import Stamp from "./Stamp.jsx";

const GamePage = () => {
    const {roomId} = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const token = sessionStorage.getItem('token');
    const myId = getMyIdFromToken(); // myId -> 로그인한 유저 아이디

    const [gameState, setGameState] = useState(location.state?.initialGameData || null);
    const [stompClient, setStompClient] = useState(null);

    // 공통 UI(채팅, 메뉴버튼 등)를 보여줄지 말지 결정하는 변수
    const showCommonUI = gameState &&
        !['DETERMINING_ORDER', 'FINISHED'].includes(gameState.status);

    useEffect(() => {
        // 1. 토큰이 없으면 아예 소켓 시도도 하지 않음
        if (!token) {
            alert("로그인이 필요합니다.");
            navigate('/login');
            return;
        }
    }, [token, navigate]);

    // 1. 소켓 연결 및 데이터 수신 로직은 여기서 한 번만!
    useEffect(() => {
        // stomp 소켓 연결 및 구독 설정
        const client = new Client({
            brokerURL: getBrokerURL(),
            connectHeaders: token ? {Authorization: `Bearer ${token}`} : {},
            onConnect: () => {
                console.log('>>> ✅ WebSocket 연결됨');
                setStompClient(client);

                client.subscribe(`/topic/games/${roomId}`, (message) => {
                    const data = JSON.parse(message.body);
                    console.log('>>> 🔔 메시지 수신:', data);
                    setGameState(data);
                });

                // 웹소켓 연결 시 현재 게임 상태 요청 - 에러, 새로고침 방지용
                client.publish({
                    destination: '/app/games/get-state',
                    body: JSON.stringify({roomId: roomId})
                });
            },
            onStompError: (frame) => {
                const errorMsg = frame.headers['message'];
                console.error('STOMP 에러:', errorMsg);

                // 유저에게 알림을 띄우고 메인 화면으로 튕기게 처리
                alert("게임 연결에 문제가 발생했습니다: " + errorMsg);
                navigate(`/rooms/${roomId}`);
            }
        });

  const myTokenId = getMyIdFromToken();
  const [devMyId, setDevMyId] = useState(null); // [DEV] 테스트용 강제 ID
  const myId = devMyId || myTokenId; // 실전엔 토큰 ID, 테스트엔 Dev ID 사용

        // 컴포넌트 언마운트 시 소켓 연결 해제
        return () => {
            if (client.active) {
                client.deactivate();
                setStompClient(null);
                console.log('>>> ❌ WebSocket 연결 해제됨');
            }
        };
    }, [roomId, token]); // roomId, token이 바뀔 때마다 재실행

    const handleIntroComplete = () => {
        stompClient.publish({
            destination: '/app/games/intro-complete',
            body: JSON.stringify({roomId: roomId})
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

    if (!gameState) return <Loading/>;

  // 액션 전송 핸들러
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

  if (!gameState) {
    return (
        <div className="game-container">
            {/* 1. 설정/채팅 버튼은 본 게임 중에만 표시 */}
            {showCommonUI && (
                <div className="game-overlay">
                    <MenuButton/>
                    <ChatToggle/>
                </div>
            )}
            {/* 2. 게임 콘텐츠 영역 */}
            <main>
                {gameState.status === 'INTRO' && stompClient && (
                    <GameIntro onSkip={handleIntroComplete}/>
                )}

                {gameState.status === 'DETERMINING_ORDER' && stompClient && (
                    <RollForOrder
                        players={gameState.players || []}
                        roomId={roomId}
                        myId={myId}
                        stompClient={stompClient}
                    />
                )}

                {gameState.status === 'WAITING_DICE' && <MainBoardPage/>}
            </main>

            {/* 사용자 패널 표시 */}
            {!['INTRO', 'DETERMINING_ORDER'].includes(gameState.status) && (
                <PlayerStatusPanel
                    players={gameState.players || []}
                    currentPlayerId={gameState.currentPlayerId}
                    myId={myId}
                />
            )}
      <>
        <Loading />
        {/* [DEV] URL 직접 접속 시 테스트를 위한 강제 데이터 주입 버튼 */}
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[9999]">
          <button
            onClick={() => {
              console.log(">>> [DEV] 강제 Mock 데이터 주입");
              setDevMyId(1); // [DEV] 나를 1번 플레이어로 설정
              setGameState({
                roomId: Number(roomId),
                status: "WAITING_DICE",
                players: [
                  { memberId: 1, nickname: "익명의 개발자", characterId: 1 },
                ],
                currentPlayerId: 1, // 내 차례
                turnOrder: [1],
                currentRound: 1,
                totalRounds: 10,
                availableDiceNumbers: [],
              });
            }}
            className="px-6 py-3 bg-red-600 text-white font-bold rounded-full shadow-lg border-4 border-white hover:scale-110 transition-transform"
          >
            🔧 [TEST] DEV: MOCK GAME START
          </button>
        </div>
      </>
    );
  }

  // [DEV] 상태 강제 변경 핸들러
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
    } else {
      console.log(">>> [DEV] No stompClient, skipping server request");
    }

    // 2. 로컬 강제 업데이트 (백엔드 데이터가 없어도 UI 테스트 가능하도록)
    setGameState((prev) => {
      console.log(
        ">>> [DEV] Updating local state:",
        prev.status,
        "->",
        newStatus
      );
      return {
        ...prev,
        status: newStatus,
      };
    });
  };

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
        {/* --- [DEV] 개발용 상태 변경 컨트롤러 --- */}
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 bg-black/50 p-4 rounded-lg backdrop-blur-sm">
          <p className="text-white text-xs font-bold mb-1 text-center">
            DEV CONTROLS
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleDevStatusChange("WAITING_LOAN")}
              className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded shadow"
            >
              🏦 은행 (Loan)
            </button>
            <button
              onClick={() => handleDevStatusChange("WAITING_STAMP")}
              className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded shadow"
            >
              ✨ 스탬프 (Stamp)
            </button>
            <button
              onClick={() => handleDevStatusChange("WAITING_DICE")}
              className="px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white text-xs rounded shadow col-span-2"
            >
              🎲 메인 (Reset)
            </button>
          </div>
        </div>
        {/* --------------------------------------- */}

        {gameState.status === "INTRO" && stompClient && (
          <GameIntro onComplete={handleIntroComplete} />
        )}

        {gameState.status === "DETERMINING_ORDER" && stompClient && (
          <RollForOrder
            players={gameState.players || []}
            roomId={roomId}
            myId={myId}
            stompClient={stompClient}
          />
        )}

        {/* 은행 이벤트 (WAITING_LOAN) */}
        {gameState.status === "WAITING_LOAN" && (
          <Loan
            isActivePlayer={isActivePlayer}
            activePlayerName={activePlayerName}
            userBalance={0} // TODO: 연동 필요
            currentLoan={0} // TODO: 연동 필요
            isBankSquare={true} // TODO: 연동 필요
            onAction={(type, amount, isBankSquare) =>
              handleAction("LOAN_ACTION", { type, amount, isBankSquare })
            }
            onExit={() => handleDevStatusChange("WAITING_DICE")}
          />
        )}

        {/* 스탬프 이벤트 (WAITING_STAMP) */}
        {gameState.status === "WAITING_STAMP" && (
          <Stamp
            isActivePlayer={isActivePlayer}
            activePlayerName={activePlayerName}
            initialCount={0} // TODO: 연동 필요
            onReward={(reward) => console.log(`Reward: ${reward}`)}
            onExit={() => handleDevStatusChange("WAITING_DICE")}
            onStampClick={() => handleAction("STAMP_ACTION", {})}
          />
        )}

        {gameState.status === "WAITING_DICE" && <MainBoardPage />}
      </main>
    </div>
  );
};

export default GamePage;
