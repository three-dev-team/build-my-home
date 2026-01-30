import React from 'react';
import Dice3D from '../../components/dice/Dice3D.jsx';
import InstructionText from '../../components/common/InstructionText.jsx';
import './css/RollDicePage.css';
import {CHARACTERS} from "../../constants/characters.js";

const RollDicePage = ({ currentPlayer, isMyTurn, diceValue, isRolling, onRollComplete, onAnimationEnd }) => {
  // 스페이스바 핸들러
  const handleKeyDown = (e) => {
    if (e.code === 'Space' && isMyTurn && !isRolling) {
      onRollComplete();
    }
  };

  React.useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMyTurn, isRolling]);

  const CHARACTER_IMG = CHARACTERS.reduce((acc, char) => {
    acc[Number(char.id)] = char.selectBasicImage;
    return acc;
  }, {});

  const charImg = currentPlayer?.characterId ? CHARACTER_IMG[currentPlayer.characterId] : null;


  return (
    <div className="roll-dice-container">
      {/* 주사위 영역 */}
      <div className="dice-area">
        {isRolling && diceValue ? (
          <Dice3D value={diceValue} onAnimationEnd={onAnimationEnd} />
        ) : (
          <img src="/images/dice/dice-idle.png" alt="주사위" className="w-32 h-32 object-contain" />
        )}
      </div>

      {/* 사용자 캐릭터 + 안내 문구 */}
      <div className="character-area">
        <img
          src={charImg}
          alt={currentPlayer?.nickname}
          className="current-character"
        />
        <div className="character-shadow"></div>
      </div>

      <InstructionText>
        {isRolling
          ? `${diceValue}칸 이동!`
          : isMyTurn
            ? '스페이스바를 눌러 주사위를 굴리기'
            : `${currentPlayer?.nickname}의 차례입니다...`}
      </InstructionText>
    </div>
  );
};

export default RollDicePage;
