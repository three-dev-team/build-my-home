import { useState, useMemo } from 'react';
import Dice3D from '../../../components/dice/Dice3D.jsx';
import InstructionText from '../../../components/common/InstructionText.jsx';
import Shadow from '../../../components/common/Shadow.jsx';
import { CHARACTERS } from '../../../constants/characters.js';
import '../css/RollDicePage.css';
import useSpaceKey from '../../../hooks/useSpaceKey.js';
import BellRewardEffect from '../../../components/effect/BellRewardEffect.jsx';
import { iGa } from '../../../utils/josa.js';

// TODO: 금주사위 전용 GLB 모델로 교체 (gold-dice-1~6.glb)

const GoldDice = ({ player, isMyTurn, diceValue, bellAmount, onRoll, onAnimationEnd, onComplete }) => {
  const [phase, setPhase] = useState('waiting'); // waiting → rolling → reward

  const charImg = useMemo(() => {
    const character = CHARACTERS.find((c) => Number(c.id) === Number(player?.characterId));
    if (!character) return null;
    return {
      basic: character.selectBasicImage,
      reward: character.rewardImage,
      headY: character.headY ?? 46,
    };
  }, [player?.characterId]);

  // 1. 스페이스바: 주사위 굴리기
  useSpaceKey(() => {
    onRoll();
  }, { enabled: isMyTurn && phase === 'waiting' });

  const handleAnimationEnd = () => {
    setPhase('reward');
    onAnimationEnd();
  };

  // diceValue가 들어오면 rolling 시작
  if (diceValue && phase === 'waiting') {
    setPhase('rolling');
  }

  return (
    <div className="roll-dice-container">
      <div className="dice-area">
        {(phase === 'rolling') ? (
          <Dice3D value={diceValue} onAnimationEnd={handleAnimationEnd} />
        ) : (
          <img src="" alt="" />
        )}
      </div>

      <div className="character-area">
        <Shadow fill={true}>
          <img
            src={phase === 'reward' ? charImg?.reward : charImg?.basic}
            alt={player?.nickname}
            className="current-character"
          />
        </Shadow>
      </div>

      {/*phase === 'reward'일 때 표시*/}
      <BellRewardEffect
        amount={bellAmount}
        show={phase === 'reward'}
        targetY={charImg?.headY ?? 46}
        onComplete={() => setTimeout(() => onComplete(), 1200)}
      />

      <InstructionText>
        {phase === 'rolling' || phase === 'reward'
          ? ''
          : isMyTurn
            ? '스페이스바를 눌러 골든 주사위를 굴리기'
            : `${player?.nickname}${iGa(player?.nickname)} 골든 주사위를 굴리고 있어요`}
      </InstructionText>
    </div>
  );
};

export default GoldDice;
