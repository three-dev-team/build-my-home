import { useState } from 'react';
import Dice3D from '../../../components/dice/Dice3D.jsx';
import InstructionText from '../../../components/common/InstructionText.jsx';
import Shadow from '../../../components/common/Shadow.jsx';
import { CHARACTERS } from '../../../constants/characters.js';
import '../css/RollDicePage.css';
import useSpaceKey from '../../../hooks/useSpaceKey.js';
import { useMemo } from 'react';
import BellRewardEffect from '../../../components/effect/BellRewardEffect.jsx';

// TODO: 금주사위 전용 GLB 모델로 교체 (gold-dice-1~6.glb)

const GoldDicePage = ({ player, isMyTurn, diceValue, bellAmount, onRoll, onAnimationEnd, onComplete }) => {
  const [phase, setPhase] = useState('waiting'); // waiting → rolling → reward
  const [rewardDone, setRewardDone] = useState(false); // 벨 획득 연출 완료 여부

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

  // 2. 스페이스바: 벨 확인 후 이동 (연출 끝나야 활성화)
  useSpaceKey(() => {
    onComplete();
  }, { enabled: isMyTurn && phase === 'reward' && rewardDone });

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
        onComplete={() => setRewardDone(true)}
      />

      <InstructionText>
        {phase === 'reward'
          ? `스페이스바를 눌러 출발하기`
          : phase === 'rolling'
            ? ''
            : isMyTurn
              ? '스페이스바를 눌러 금주사위를 굴리기'
              : `${player?.nickname} 금주사위를 굴리고 있어요`}
      </InstructionText>
    </div>
  );
};

export default GoldDicePage;
