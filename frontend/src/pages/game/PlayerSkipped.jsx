import { useGameTimer } from '../../hooks/useGameTimer.js';
import { useExitHandler } from '../../hooks/useExitHandler.js';
import { CHARACTERS } from '../../constants/characters.js';
import InstructionText from '../../components/common/InstructionText.jsx';
import './css/PlayerSkipped.css';

const PlayerSkipped = ({ isMyTurn, player, onExit }) => {
  const currentPlayerName = player?.nickname || '플레이어';
  const handleExit = useExitHandler(isMyTurn, onExit);
  useGameTimer(5, handleExit);

  const CHARACTER_IMG = CHARACTERS.reduce((acc, char) => {
    acc[Number(char.id)] = char.selectBasicImage;
    return acc;
  }, {});

  const charImg = player.characterId ? CHARACTER_IMG[player.characterId] : null;

  return (
    <div className="player-skipped-container">
      {/* 상단 메시지 */}
      <div className="top-message">잠시 후 자동으로 이동합니다...</div>

      {/* 캐릭터 영역 */}
      <div className="skipped-character-area">
        <img src={charImg} alt={currentPlayerName} className="skipped-character" />
        <div className="skipped-character-shadow"></div>
      </div>

      <InstructionText>{currentPlayerName}이 잠깐 졸고 있는 거 같다...</InstructionText>
    </div>
  );
};

export default PlayerSkipped;
