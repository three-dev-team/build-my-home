import React, { useEffect, useState } from 'react';
import './RollForOrder.css';

const RollForOrder = ({ players, myId, onRoll }) => {
    const [isRolling, setIsRolling] = useState(false);
    const myDiceValue = players.find(p => p.memberId === myId)?.orderDiceValue;

    // 스페이스바 입력 감지
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.code === 'Space') {
                // 내가 아직 안 굴렸고, 현재 굴리는 중이 아닐 때만 발송
                if (!myDiceValue && !isRolling) {
                    handleRoll();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [myDiceValue, isRolling]);

    const handleRoll = () => {
        setIsRolling(true);
        onRoll(); // 부모 컴포넌트에 알림
        // 시각적인 효과를 위해 약간의 딜레이 후 굴림 애니메이션 중단
        setTimeout(() => setIsRolling(false), 1000);
    };

    return (
        <div className="order-scene-container">
            <div className="instruction-text">
                {!myDiceValue ? "스페이스바를 눌러 주사위를 굴리세요!" : "다른 플레이어를 기다리는 중..."}
            </div>

            <div className="player-lineup">
                {players.map((player) => {
                    const diceValue = player.orderDiceValue;
                    const isMe = player.memberId === myId;

                    return (
                        <div key={player.memberId} className="player-unit">
                            {/* 주사위 영역 */}
                            <div className="dice-wrapper">
                                {diceValue ? (
                                    // 결과 숫자 표시 (이미지의 4, 8, 3 느낌)
                                    <div className="dice-result bounce-in">{diceValue}</div>
                                ) : (
                                    // 굴리기 전 혹은 굴리는 중인 주사위
                                    <div className={`dice-obj ${isMe && !isRolling ? 'my-dice' : ''} ${isRolling && isMe ? 'spinning' : 'floating'}`}>
                                        🎲
                                    </div>
                                )}
                            </div>

                            {/* 캐릭터 이미지 */}
                            <div className="character-box">
                                <img src={`/assets/characters/char_${player.characterId}.png`} alt={player.nickname} />
                                <div className={`nickname-tag ${isMe ? 'highlight' : ''}`}>
                                    {player.nickname}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="bottom-hint">
                <span className="icon">⌨️</span> 스페이스바 누르기
            </div>
        </div>
    );
};

export default RollForOrder;