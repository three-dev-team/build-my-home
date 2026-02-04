// RollForOrder.jsx
import React from 'react';
import useDiceRoll from '../../hooks/useDiceRoll';
import './css/RollForOrder.css';
import { CHARACTERS } from '../../constants/characters.js';
import InstructionText from '../../components/common/InstructionText.jsx';
import Shadow from '../../components/common/Shadow.jsx';

const RollForOrder = ({ players, myId, onRoll }) => {
  const myDiceValue = players.find((p) => p.memberId === myId)?.orderDiceValue;

  const { isRolling } = useDiceRoll({
    enabled: !myDiceValue,
    onRollComplete: () => onRoll(),
  });

  const CHARACTER_IMG = CHARACTERS.reduce((acc, char) => {
    acc[Number(char.id)] = char.selectBasicImage;
    return acc;
  }, {});

  return (
    <div className="order-scene-container">
        <InstructionText>
          {!myDiceValue ? '스페이스바를 눌러 주사위 굴리기' : '다른 플레이어를 기다리는 중...'}
        </InstructionText>

      <div className="player-lineup">
        {players.map((player) => {
          const diceValue = player.orderDiceValue;
          const isMe = player.memberId === myId;
          const charImg = player.characterId ? CHARACTER_IMG[player.characterId] : null;

          return (
            <div key={player.memberId} className="player-unit">
              <div className="dice-wrapper">
                {diceValue ? (
                  <img
                    src={`/images/dice/dice-result-${diceValue}.webp`}
                    alt={`주사위 ${diceValue}`}
                    className="dice-result-img bounce-in"
                  />
                ) : (
                  <div
                    className={`dice-obj ${isMe && !isRolling ? 'my-dice' : ''} ${isRolling && isMe ? 'spinning' : 'floating'}`}
                  >
                    🎲
                  </div>
                )}
              </div>

              <div className="character-box">
                <Shadow>
                  <img src={charImg} alt={player.nickname} />
                  <div className={`nickname-tag ${isMe ? 'highlight' : ''}`}>{player.nickname}</div>
                </Shadow>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RollForOrder;
