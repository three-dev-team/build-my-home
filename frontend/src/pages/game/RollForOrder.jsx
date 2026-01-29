// RollForOrder.jsx
import React from 'react';
import useDiceRoll from '../../hooks/useDiceRoll';
import './css/RollForOrder.css';

const RollForOrder = ({ players, myId, onRoll }) => {
  const myDiceValue = players.find((p) => p.memberId === myId)?.orderDiceValue;

  const { isRolling } = useDiceRoll({
    enabled: !myDiceValue,
    onRollComplete: () => onRoll(),
  });

  return (
    <div className="order-scene-container">
      <div className="instruction-text">
        {!myDiceValue ? '스페이스바를 눌러 주사위를 굴리세요!' : '다른 플레이어를 기다리는 중...'}
      </div>

      <div className="player-lineup">
        {players.map((player) => {
          const diceValue = player.orderDiceValue;
          const isMe = player.memberId === myId;

          return (
            <div key={player.memberId} className="player-unit">
              <div className="dice-wrapper">
                {diceValue ? (
                  <div className="dice-result bounce-in">{diceValue}</div>
                ) : (
                  <div
                    className={`dice-obj ${isMe && !isRolling ? 'my-dice' : ''} ${isRolling && isMe ? 'spinning' : 'floating'}`}
                  >
                    🎲
                  </div>
                )}
              </div>

              <div className="character-box">
                <img src={`/assets/characters/char_${player.characterId}.png`} alt={player.nickname} />
                <div className={`nickname-tag ${isMe ? 'highlight' : ''}`}>{player.nickname}</div>
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
