import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

function Room() {
    const { roomId } = useParams();
    const [loading, setLoading] = useState(true);
    const [roomTitle, setRoomTitle] = useState('');
    const [players, setPlayers] = useState([]);
    const [currentPlayerId, setCurrentPlayerId] = useState(1);

    useEffect(() => {
        // TODO: 나중에 실제 API 호출로 교체
        // const response = await fetch(`/api/rooms/${roomId}`);
        // const data = await response.json();

        // 임시 목업 데이터
        setTimeout(() => {
            setRoomTitle('즐거운 게임방');
            setPlayers([
                { id: 1, nickname: '플레이어1', character: null, isReady: false, isHost: true },
                { id: 2, nickname: '플레이어2', character: null, isReady: false, isHost: false },
                { id: 3, nickname: null, character: null, isReady: false, isHost: false },
                { id: 4, nickname: null, character: null, isReady: false, isHost: false },
            ]);
            setLoading(false);
        }, 1000); // 1초 로딩 시뮬레이션
    }, [roomId]);

    const currentPlayer = players.find(p => p.id === currentPlayerId);
    const isHost = currentPlayer?.isHost;
    const allReady = players.filter(p => p.nickname).every(p => p.isReady || p.isHost);

    const handleReady = () => {
        setPlayers(players.map(p =>
            p.id === currentPlayerId ? { ...p, isReady: !p.isReady } : p
        ));
    };

    const handleStartGame = () => {
        if (allReady) {
            console.log('게임 시작!');
        }
    };

    const handleLeave = () => {
        console.log('방 나가기');
    };

    const handleSettings = () => {
        console.log('설정 열기');
    };

    if (loading) {
        return <div>로딩 중...</div>;
    }

    return (
        <div>
            <div>
                <h1>{roomTitle}</h1>
                <button onClick={handleSettings}>설정</button>
            </div>

            <div>
                {players.map((player, index) => (
                    <div key={player.id}>
                        <div>
                            {player.nickname ? '캐릭터 이미지' : '빈 슬롯'}
                        </div>
                        <div>
                            {player.nickname ? (
                                <>
                                    player {index + 1}({player.nickname})
                                    {player.isHost && ' 👑'}
                                </>
                            ) : (
                                '대기 중...'
                            )}
                        </div>
                        <div>
                            {player.nickname && (
                                player.isHost ? 'HOST' : (player.isReady ? 'ready' : 'unready')
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div>
                {isHost ? (
                    <button onClick={handleStartGame} disabled={!allReady}>
                        게임 시작
                    </button>
                ) : (
                    <button onClick={handleReady}>
                        {currentPlayer?.isReady ? '준비 완료' : '준비'}
                    </button>
                )}
                <button onClick={handleLeave}>나가기</button>
            </div>
        </div>
    );
}

export default Room;