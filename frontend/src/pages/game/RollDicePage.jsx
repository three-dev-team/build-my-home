// import Dice3D from '../../components/dice/Dice3D.jsx';
// import InstructionText from '../../components/common/InstructionText.jsx';
// import './css/RollDicePage.css';
// import { CHARACTERS } from '../../constants/characters.js';
// import Shadow from '../../components/common/Shadow.jsx'
// import useSpaceKey from '../../hooks/useSpaceKey.js';
// import { iGa } from '../../utils/josa.js';
//
// const RollDicePage = ({ currentPlayer, isMyTurn, diceValue, isRolling, onRollComplete, onAnimationEnd }) => {
//   // 스페이스바 핸들러
//   useSpaceKey(() => onRollComplete(), { enabled: isMyTurn && !isRolling });
//
//   const CHARACTER_IMG = CHARACTERS.reduce((acc, char) => {
//     acc[Number(char.id)] = char.selectBasicImage;
//     return acc;
//   }, {});
//
//   const charImg = currentPlayer?.characterId ? CHARACTER_IMG[currentPlayer.characterId] : null;
//
//   const name = String(currentPlayer?.nickname ?? '').trim() || '플레이어';
//
//   return (
//     <div className="roll-dice-container">
//       {/* 주사위 영역 */}
//       <div className="dice-area">
//         {isRolling && diceValue ? (
//           <Dice3D value={diceValue} onAnimationEnd={onAnimationEnd} />
//         ) : (
//           <img src="" alt="" />
//         )}
//       </div>
//
//       {/* 사용자 캐릭터 + 안내 문구 */}
//       <div className="character-area">
//         <Shadow fill={true}>
//           <img src={charImg} alt={currentPlayer?.nickname} className="current-character" />
//         </Shadow>
//       </div>
//
//       <InstructionText>
//         {isRolling
//           ? ``
//           : isMyTurn
//             ? '스페이스바를 눌러 주사위를 굴리기'
//             : `${name}${iGa(name)} 주사위를 굴리고 있어요`}
//       </InstructionText>
//     </div>
//   );
// };
//
// export default RollDicePage;

import React, { useState } from 'react';
import Dice3D from '../../components/dice/Dice3D.jsx';
import InstructionText from '../../components/common/InstructionText.jsx';
import CircleBlackout from '../../components/common/CircleBlackout.jsx';
import './css/RollDicePage.css';
import { CHARACTERS } from '../../constants/characters.js';
import Shadow from '../../components/common/Shadow.jsx';
import useSpaceKey from '../../hooks/useSpaceKey.js';
import { iGa } from '../../utils/josa.js';

const RollDicePage = ({ currentPlayer, isMyTurn, diceValue, isRolling, onRollComplete, onAnimationEnd }) => {
  const [isOpening, setIsOpening] = useState(true);
  const [isClosing, setIsClosing] = useState(false);

  useSpaceKey(() => onRollComplete(), { enabled: isMyTurn && !isRolling && !isOpening });

  const CHARACTER_IMG = CHARACTERS.reduce((acc, char) => {
    acc[Number(char.id)] = char.selectBasicImage;
    return acc;
  }, {});

  const charImg = currentPlayer?.characterId ? CHARACTER_IMG[currentPlayer.characterId] : null;
  const name = String(currentPlayer?.nickname ?? '').trim() || '플레이어';

  // 주사위 애니메이션 끝나면 암전 시작
  const handleDiceAnimEnd = () => {
    setIsClosing(true);
  };

  return (
    <div className="roll-dice-container">
      <div className="dice-area">
        {isRolling && diceValue ? (
          <Dice3D value={diceValue} onAnimationEnd={handleDiceAnimEnd} />
        ) : (
          <img src="" alt="" />
        )}
      </div>

      <div className="character-area">
        <Shadow fill={true}>
          <img src={charImg} alt={currentPlayer?.nickname} className="current-character" />
        </Shadow>
      </div>

      <InstructionText>
        {isRolling
          ? ''
          : isMyTurn
            ? '스페이스바를 눌러 주사위를 굴리기'
            : `${name}${iGa(name)} 주사위를 굴리고 있어요`}
      </InstructionText>

      {/* 등장 연출 (열기) */}
      <CircleBlackout
        show={isOpening}
        type="open"
        duration={1000}
        onDone={() => setIsOpening(false)}
      />

      {/* 퇴장 연출 (닫기) */}
      <CircleBlackout
        show={isClosing}
        type="close"
        duration={1000}
        onDone={() => {
          setIsClosing(false);
          onAnimationEnd?.();
        }}
      />
    </div>
  );
};

export default RollDicePage;
