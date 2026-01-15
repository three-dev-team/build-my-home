import { useEffect, useState } from "react";
import { Client } from "@stomp/stompjs";
import {getBrokerURL} from "../../utils/ws.js";
import {useNavigate, useParams} from "react-router-dom";
import LoadingScreen from "../../components/common/LoadingScreen.jsx";
import MenuButton from "../../components/game/MenuButton.jsx";
import ChatToggle from "../../components/game/ChatToggle.jsx";
import RollForOrder from "../../components/game/RollForOrder.jsx";


const GamePage = () => {
    const {roomId} = useParams();
    const navigate = useNavigate();
    const token = sessionStorage.getItem('token');
    const [gameState, setGameState] = useState(null);

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

                client.subscribe(`/topic/rooms/${roomId}`, (message) => {
                    const data = JSON.parse(message.body);
                    console.log('>>> 🔔 메시지 수신:', data);

                    // TODO: 수신한 게임 상태 데이터를 gameState에 반영
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
                console.log('>>> ❌ WebSocket 연결 해제됨');
            }
        };
    }, [roomId, token]); // roomId, token이 바뀔 때마다 재실행

    if (!gameState) return <LoadingScreen />;

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
                {gameState.status === 'DETERMINING_ORDER' && <RollForOrder />}
            </main>
        </div>
    );
};