import { useGameTimer } from '../../hooks/useGameTimer.js';
import { useExitHandler } from '../../hooks/useExitHandler.js';
import { CHARACTERS } from '../../constants/characters.js';
import InstructionText from '../../components/common/InstructionText.jsx';
import './css/PlayerSkipped.css';
import Shadow from '../../components/common/Shadow.jsx';
import AutoMove from '../../components/common/AutoMove.jsx';
import { iGa } from '../../utils/josa.js';

const PlayerLeft = ({ isMyTurn, player, onExit }) => {
  const playerName = player?.nickname || '플레이어';
  const handleExit = useExitHandler(isMyTurn, onExit);
  useGameTimer(5, handleExit);

  const character = CHARACTERS.find((c) => Number(c.id) === Number(player?.characterId));
  const charImg = character?.sleepImage ?? null;

  return (
    <div className="player-skipped-container">
      <AutoMove
        text={`${playerName}의 연결이 끊어졌습니다. 잠시 후 이동합니다`}
        widthPx={700}
      />
      <div className="skipped-character-area">
        <Shadow fill={true}>
          <img src={charImg} alt={playerName} className="skipped-character" draggable="false" />
        </Shadow>
      </div>

      <InstructionText>{playerName}${iGa(playerName)} 깊은 잠에 빠진 거 같다...</InstructionText>
    </div>
  );
};

export default PlayerLeft;
