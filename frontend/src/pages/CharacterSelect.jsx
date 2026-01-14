import {useState, useEffect} from 'react';
import {useParams, useNavigate} from 'react-router-dom';
import {Client} from '@stomp/stompjs';
import {CHARACTERS} from '../constants/characters';
import {leaveRoom} from "../utils/roomUtils.js";

function CharacterSelect() {
    const {roomId} = useParams();
    const navigate = useNavigate(); // 페이지 이동
    const [selectedCharacter, setSelectedCharacter] = useState(null);
    const [takenCharacters, setTakenCharacters] = useState([]);
    const [stompClient, setStompClient] = useState(null);
    const token = sessionStorage.getItem('token');

    // websocket 연결
    useEffect(() => {
        const client = new Client({
            brokerURL: 'ws://localhost:5173/ws',
            connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
            onConnect: () => {
                console.log('>>> ✅ WebSocket 연결됨');

                // 내 컴퓨터 (client)가 topic/rooms/{roomId} 구독한다
                client.subscribe(`/topic/rooms/${roomId}`, (message) => {
                    const data = JSON.parse(message.body);
                    console.log('>>> 메시지 수신:', data);

                    if (data.players) {
                        // 이미 누군가가 선택한 캐릭터 ID들만 모아서 상태 업데이트
                        const selectedIds = data.players
                            .filter(p => p.characterId !== null)
                            .map(p => Number(p.characterId));

                        setTakenCharacters(selectedIds);
                    }
                });

                // 현재 방 상태 요청
                client.publish({
                    destination: '/app/rooms/get-players',
                    body: JSON.stringify({ roomId: roomId })
                });
            }
        });

        client.activate();
        setStompClient(client);

        return () => {
            client.deactivate();
        };
    }, [roomId]);


    const handleSelect = (characterId) => {
        if (takenCharacters.includes(characterId)) return;
        setSelectedCharacter(characterId);
    };

    const handleEnter = () => {
        if (!selectedCharacter || !stompClient) return;

        // 서버에 캐릭터 선택 정보 전송
        stompClient.publish({
            destination: '/app/rooms/select-character',
            body: JSON.stringify({
                roomId: roomId,
                characterId: selectedCharacter
            })
        });
        navigate(`/rooms/${roomId}`);
    };

    const handleLeave = () => {
        leaveRoom(stompClient, roomId);
        navigate('/room-list');
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minHeight: '100vh',
            paddingTop: '50px'
        }}>
            <h1>나의 주민을 선택하세요</h1>

            <div style={{display: 'flex', gap: '30px', justifyContent: 'center', marginTop: '40px'}}>
                {CHARACTERS.map(character => {
                    const isTaken = takenCharacters.includes(character.id);
                    const isSelected = selectedCharacter === character.id;

                    return (
                        <div
                            key={character.id}
                            onClick={() => handleSelect(character.id)}
                            style={{
                                cursor: isTaken ? 'not-allowed' : 'pointer',
                            }}
                        >
                            <img
                                src={
                                    isTaken ? character.selectedImage :
                                        isSelected ? character.selectImage :
                                            character.selectBasicImage
                                }
                                alt={character.name}
                                style={{width: '245px', height: '376px'}}
                            />
                        </div>
                    );
                })}
            </div>

            <div style={{marginTop: '50px', display: 'flex', gap: '20px'}}>
                <button
                    onClick={handleEnter}
                    disabled={!selectedCharacter}
                    style={{
                        padding: '15px 40px',
                        fontSize: '18px',
                        cursor: selectedCharacter ? 'pointer' : 'not-allowed',
                        backgroundColor: selectedCharacter ? '#f5a623' : '#ccc',
                        border: 'none',
                        borderRadius: '10px',
                        color: 'white'
                    }}>
                    입장하기
                </button>
                <button
                    onClick={handleLeave}
                    style={{
                        padding: '15px 40px',
                        fontSize: '18px',
                        cursor: 'pointer',
                        backgroundColor: '#888',
                        border: 'none',
                        borderRadius: '10px',
                        color: 'white'
                    }}>
                    나가기
                </button>
            </div>
        </div>
    );
}

export default CharacterSelect;