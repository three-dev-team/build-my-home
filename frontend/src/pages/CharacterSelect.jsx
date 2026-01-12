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

    // TODO : 실제 로그인 유저 정보로 대체 필요
    const currentMemberId = 1;
    const currentNickname = "티파니";

    // websocket 연결
    useEffect(() => {
        const client = new Client({
            brokerURL: 'ws://localhost:5173/ws',
            onConnect: () => {
                console.log('>>> ✅ WebSocket 연결됨');

                // 내 컴퓨터 (client)가 topic/rooms/{roomId} 구독한다
                client.subscribe(`/topic/rooms/${roomId}`, (message) => {
                    const data = JSON.parse(message.body);
                    console.log('>>> 메시지 수신:', data);

                    if(data.type === 'ROOM_STATE') {
                        // 현재 방 상태 업데이트
                        const takenCharacters = data.players.map(player => player.characterId);
                        setTakenCharacters(takenCharacters);
                    }

                    if (data.type === 'CHARACTER_SELECT') {
                        // 캐릭터 선택하면 takenCharacters에 추가
                        setTakenCharacters(prev => [...prev, data.characterId]);
                    }

                    if (data.type === 'PLAYER_LEAVE') {
                        // 플레이어가 나가면 takenCharacters에서 제거
                        setTakenCharacters(prev => prev.filter(id => id !== data.characterId));
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
                memberId: currentMemberId,
                nickname: currentNickname,
                characterId: selectedCharacter
            })
        });
        navigate(`/rooms/${roomId}`);
    };

    const handleLeave = () => {
        // TODO: 입장하기 눌렀을 때 roomMemebers에 등록했는지 확인
        // TODO: roomState.getPlayers().size() 로 입장인원 관리하는 방향 검토 요청
        leaveRoom(stompClient, roomId, currentMemberId);
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