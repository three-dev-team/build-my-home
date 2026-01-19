import React from 'react';
import useDiceRoll from '../../hooks/useDiceRoll';
import '/Users/suminhong/web_0826_hsm/workspace/buildmyhome_workspace/frontend/src/pages/game/css/RollDicePage.css';

const RollDicePage = ({ currentPlayer, isMyTurn, onRollComplete }) => {
    const { isRolling, diceDisplay } = useDiceRoll({
        enabled: isMyTurn,
        onRollComplete
    });

    return (
        <div className="roll-dice-container">
            <div className="dice-area">
                <div className={`dice-block ${isRolling ? 'spinning' : ''}`}>
                    {diceDisplay || '?'}
                </div>
            </div>

            <div className="instruction-text">
                {isMyTurn
                    ? "스페이스바를 눌러 주사위를 굴리세요!"
                    : `${currentPlayer.nickname}의 차례입니다...`
                }
            </div>

            <div className="current-player-area">
                <img
                    src={`/assets/characters/char_${currentPlayer.characterId}.png`}
                    alt={currentPlayer.nickname}
                    className="current-character"
                />
                <div className="player-name">{currentPlayer.nickname}</div>
            </div>

            {isMyTurn && (
                <div className="bottom-hint">
                    <span>⌨️</span> 스페이스바
                </div>
            )}
        </div>
    );
};

export default RollDicePage;