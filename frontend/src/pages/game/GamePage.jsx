import { useEffect, useState } from "react";
import { Client } from "@stomp/stompjs";
import {getBrokerURL} from "../../utils/ws.js";
import {useLocation, useNavigate, useParams} from "react-router-dom";
import Loading from "../../components/common/Loading.jsx";
import MenuButton from "../../components/common/MenuButton.jsx";
import ChatToggle from "../../components/common/ChatToggle.jsx";
import RollForOrder from "./RollForOrder.jsx";
import {getMyIdFromToken} from "../../utils/auth.js";
import MainBoardPage from "./MainBoardPage.jsx";
import GameIntro from "./GameIntro.jsx";


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

                    setGameState(data);
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

        client.activate();

        // 컴포넌트 언마운트 시 소켓 연결 해제
        return () => {
            if (client.active){
                client.deactivate();
                setStompClient(null);
                console.log('>>> ❌ WebSocket 연결 해제됨');
            }
        };
    }, [roomId, token]); // roomId, token이 바뀔 때마다 재실행


    const handleIntroComplete = () => {
        stompClient.publish({
            destination: '/app/games/intro-complete',
            body: JSON.stringify({ roomId: roomId })
        });
    };

    if (!gameState) return <Loading />;

    console.log("players:", gameState.players);

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
                {gameState.status === 'INTRO' && stompClient && (
                    <GameIntro onComplete={handleIntroComplete} />
                )}

                {gameState.status === 'DETERMINING_ORDER' && stompClient && (
                    <RollForOrder
                        players={gameState.players || []}
                        roomId={roomId}
                        myId={myId}
                        stompClient={stompClient}
                    />
                )}

                {gameState.status === 'WAITING_DICE' && <MainBoardPage />}
            </main>
        </div>
    );
};

export default GamePage;