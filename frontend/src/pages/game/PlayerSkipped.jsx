import { useGameTimer } from '../../hooks/useGameTimer.js';
import { useExitHandler } from '../../hooks/useExitHandler.js';
import { CHARACTERS } from '../../constants/characters.js';
import InstructionText from '../../components/common/InstructionText.jsx';
import './css/PlayerSkipped.css';
import Shadow from '../../components/common/Shadow.jsx';

const PlayerSkipped = ({ isMyTurn, player, onExit }) => {
  const currentPlayerName = player?.nickname || '플레이어';
  const handleExit = useExitHandler(isMyTurn, onExit);
  useGameTimer(5, handleExit);

  const character = CHARACTERS.find((c) => Number(c.id) === Number(player?.characterId));
  const charImg = character?.sleepImage ?? null;

  return (
    <div className="player-skipped-container">
      <div className="top-message">잠시 후 자동으로 이동합니다...</div>

      {/* 캐릭터 영역 */}
      {/*<div className="skipped-character-area">*/}
      {/*  {charImg && <img src={charImg} alt={currentPlayerName} className="skipped-character" draggable="false" />}*/}
      {/*  <div className="skipped-character-shadow"></div>*/}
      {/*</div>*/}
      {/* 캐릭터 영역 */}
      <div className="skipped-character-area">
        <Shadow fill={true}>
          {charImg && <img src={charImg} alt={currentPlayerName} className="skipped-character" draggable="false" />}
        </Shadow>
      </div>

      <InstructionText>{currentPlayerName}이 잠깐 졸고 있는 거 같다...</InstructionText>
    </div>
  );
};

export default PlayerSkipped;
