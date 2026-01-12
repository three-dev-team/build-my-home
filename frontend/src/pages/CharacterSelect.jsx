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
        if (takenCharacters.includes(characterId)) {
            alert('이미 선택된 캐릭터입니다.');
            return;
        }
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
        navigate('/roomlist');
    };

    return (
        <div>
            <h1>나의 주민을 선택하세요</h1>

            <div style={{display: 'flex', gap: '20px', justifyContent: 'center'}}>
                {CHARACTERS.map(character => {
                    const isTaken = takenCharacters.includes(character.id);
                    const isSelected = selectedCharacter === character.id;

                    return (
                        <div
                            key={character.id}
                            onClick={() => handleSelect(character.id)}
                            style={{
                                width: '180px',
                                padding: '20px',
                                backgroundColor: '#f5e6c8',
                                borderRadius: '15px',
                                cursor: isTaken ? 'not-allowed' : 'pointer',
                                border: isSelected ? '4px solid #f5a623' : '4px solid transparent',
                                opacity: isTaken ? 0.7 : 1,
                                textAlign: 'center',
                                position: 'relative',
                            }}
                        >
                            {isTaken && (
                                <div style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    backgroundColor: 'rgba(0,0,0,0.5)',
                                    color: 'white',
                                    padding: '5px 15px',
                                    borderRadius: '5px',
                                    fontWeight: 'bold',
                                }}>
                                    선택됨
                                </div>
                            )}
                            <img
                                src={character.profileImage}
                                alt={character.name}
                                style={{width: '120px', height: '120px'}}
                            />
                            <div style={{marginTop: '10px', fontWeight: 'bold'}}>
                                {character.name}
                            </div>
                        </div>
                    );

                })}

            </div>


            <div style={{marginTop: '40px', display: 'flex', gap: '20px', justifyContent: 'center'}}>
                <button onClick={handleEnter}
                        disabled={!selectedCharacter}
                        style={{
                            cursor: selectedCharacter ? 'pointer' : 'not-allowed'
                        }}>
                    입장하기
                </button>
                <button onClick={handleLeave}>
                    나가기
                </button>
            </div>
        </div>
    );
}

export default CharacterSelect;