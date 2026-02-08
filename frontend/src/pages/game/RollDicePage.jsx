import Dice3D from '../../components/dice/Dice3D.jsx';
import InstructionText from '../../components/common/InstructionText.jsx';
import './css/RollDicePage.css';
import { CHARACTERS } from '../../constants/characters.js';
import Shadow from '../../components/common/Shadow.jsx'
import useSpaceKey from '../../hooks/useSpaceKey.js';
import { iGa } from '../../constants/josa.js';

const RollDicePage = ({ currentPlayer, isMyTurn, diceValue, isRolling, onRollComplete, onAnimationEnd }) => {
  // 스페이스바 핸들러
  useSpaceKey(() => onRollComplete(), { enabled: isMyTurn && !isRolling });

  const CHARACTER_IMG = CHARACTERS.reduce((acc, char) => {
    acc[Number(char.id)] = char.selectBasicImage;
    return acc;
  }, {});

  const charImg = currentPlayer?.characterId ? CHARACTER_IMG[currentPlayer.characterId] : null;

  const name = String(currentPlayer?.nickname ?? '').trim() || '플레이어';

  return (
    <div className="roll-dice-container">
      {/* 주사위 영역 */}
      <div className="dice-area">
        {isRolling && diceValue ? (
          <Dice3D value={diceValue} onAnimationEnd={onAnimationEnd} />
        ) : (
          <img src="" alt="" />
        )}
      </div>

      {/* 사용자 캐릭터 + 안내 문구 */}
      <div className="character-area">
        <Shadow fill={true}>
          <img src={charImg} alt={currentPlayer?.nickname} className="current-character" />
        </Shadow>
      </div>

      <InstructionText>
        {isRolling
          ? ``
          : isMyTurn
            ? '스페이스바를 눌러 주사위를 굴리기'
            : `${name}${iGa(name)} 주사위를 굴리고 있어요`}
      </InstructionText>
    </div>
  );
};

export default RollDicePage;
