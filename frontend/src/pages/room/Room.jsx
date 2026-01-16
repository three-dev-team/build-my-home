import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Client } from "@stomp/stompjs";
import { leaveRoom } from "../../utils/roomUtils.js";
import { getBrokerURL } from "../../utils/ws.js";
import { getMyIdFromToken } from "../../utils/auth.js";

function Room() {
  const { roomId } = useParams();
  const [loading, setLoading] = useState(true);
  const [roomTitle, setRoomTitle] = useState("");
  const [players, setPlayers] = useState([]);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [totalRounds, setTotalRounds] = useState(10);
  const [stompClient, setStompClient] = useState(null);
  const navigate = useNavigate();
  const token = sessionStorage.getItem("token");

  const myId = getMyIdFromToken();

  const currentPlayer = players.find((player) => player.memberId === myId);
  const isHost = currentPlayer?.isHost;
  const allReady = players
    .filter((player) => player.nickname)
    .every((player) => player.isReady);

  // 방 정보 불러오기 REST API 호출
  // TODO: 호스트도 players 배열에 포함시키기, isHost:true 로 설정
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
        console.log(">>> ✅ WebSocket 연결됨");

        client.subscribe(`/topic/rooms/${roomId}`, (message) => {
          const data = JSON.parse(message.body);
          console.log(">>> 🔔 메시지 수신:", data);

          if (data.type === "GAME_START") {
            navigate(`/games/${roomId}`, { state: { initialGameData: data } });
          }

          if (data.players) {
            const updated = Array.from({ length: maxPlayers }, (_, idx) => ({
              index: idx + 1,
              memberId: null,
              nickname: null,
              characterId: null,
              isReady: false,
              isHost: false,
            }));

            data.players.forEach((p, idx) => {
              if (idx < maxPlayers) {
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
          }
        });

        // 현재 방 상태 요청 추가
        client.publish({
          destination: "/app/rooms/get-players",
          body: JSON.stringify({ roomId: roomId }),
        });
      },
    });

    client.activate();
    setStompClient(client);

    return () => {
      if (client.active) {
        client.deactivate();
        console.log(">>> ❌ WebSocket 연결 해제됨");
      }
    };
  }, [roomId, maxPlayers, loading]);

  const handleReady = () => {
    if (!stompClient) return;

    // 레디 상태 토글은 서버에서 처리
    // 여러명이서 누를 수 있으니 클라이언트에서 상태 관리X
    stompClient.publish({
      destination: "/app/rooms/ready",
      body: JSON.stringify({ roomId: roomId }),
    });
  };

  const handleStartGame = () => {
    console.log("게임 시작 버튼 클릭");
    if (allReady) {
      stompClient.publish({
        destination: "/app/games/start",
        body: JSON.stringify({ roomId: roomId }),
      });
    }
  };

  const handleLeave = () => {
    leaveRoom(stompClient, roomId);
    navigate("/room-list");
  };

  const handleSettings = () => {
    console.log("설정 열기");
  };

  if (loading) {
    return <div>로딩 중...</div>;
  }

  return (
    <div>
      <div>
        <button onClick={handleSettings}>설정</button>
        <h1>{roomTitle}</h1>
        <h3>참여 인원: {maxPlayers}명</h3>
        <h3>판수: {totalRounds}</h3>
      </div>

      <div>
        {players.map((player, index) => (
          <div key={player.index}>
            <div>
              {player.characterId}
              {player.nickname ? "캐릭터 이미지 파일" : "빈 슬롯"}
            </div>
            <div>
              {player.nickname ? (
                <>
                  {player.nickname}
                  {player.isHost && "[방장]"}
                  {/* [TEST] 방장이고, 내가 아니고, 상대가 존재하면 위임 버튼 */}
                  {isHost && player.memberId !== myId && player.memberId && (
                    <button
                      onClick={() => {
                        if (stompClient) {
                          stompClient.publish({
                            destination: "/app/rooms/delegate-host",
                            body: JSON.stringify({
                              roomId: Number(roomId),
                              memberId: player.memberId,
                            }),
                          });
                        }
                      }}
                      style={{
                        marginLeft: "5px",
                        fontSize: "10px",
                        background: "#ffd700",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      👑 위임
                    </button>
                  )}
                </>
              ) : (
                "(플레이어 이름)"
              )}
            </div>
            {/*닉네임이 있어야 ready/unready 버튼이 보여짐*/}
            <div>
              {player.nickname
                ? player.isReady
                  ? "ready"
                  : "unready"
                : "(준비버튼)"}
            </div>
          </div>
        ))}
      </div>

      <div>
        {/* 1. 모든 플레이어(방장 포함)에게 준비 버튼 표시 */}
        <button onClick={handleReady}>
          {currentPlayer?.isReady ? "준비완료" : "준비"}
        </button>

        {/* 2. 방장에게만 추가로 '게임 시작' 버튼 표시 */}
        {isHost && (
          <button onClick={handleStartGame} disabled={!allReady}>
            {" "}
            게임 시작{" "}
          </button>
        )}

        <button onClick={handleLeave} style={{ marginLeft: "10px" }}>
          나가기
        </button>
      </div>
    </div>
  );
}

export default Room;
