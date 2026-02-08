import { useState, useEffect, useMemo } from 'react';
import Dice3D from '../../../components/dice/Dice3D.jsx';
import InstructionText from '../../../components/common/InstructionText.jsx';
import Shadow from '../../../components/common/Shadow.jsx';
import { CHARACTERS } from '../../../constants/characters.js';
import useSpaceKey from '../../../hooks/useSpaceKey.js';
import '../css/RollDicePage.css';
import './DoubleDice.css';
import { iGa } from '../../../utils/josa.js';

const DoubleDice = ({ player, isMyTurn, firstValue, secondValue, onAction }) => {
  // waiting → first-rolling → first-done → second-rolling → result → done
  const [phase, setPhase] = useState('waiting');

  const charImg = useMemo(() => {
    const character = CHARACTERS.find((c) => Number(c.id) === Number(player?.characterId));
    return character?.selectBasicImage || null;
  }, [player?.characterId]);

  // 1. 스페이스바: 첫 번째 주사위
  useSpaceKey(() => {
    onAction('DOUBLE_DICE_ROLL');
  }, { enabled: isMyTurn && phase === 'waiting' });

  // 2. 스페이스바: 두 번째 주사위
  useSpaceKey(() => {
    onAction('DOUBLE_DICE_ROLL');
  }, { enabled: isMyTurn && phase === 'first-done' });

  // 첫 번째 값 들어오면 rolling 시작
  if (firstValue && phase === 'waiting') {
    setPhase('first-rolling');
  }

  // 두 번째 값 들어오면 rolling 시작
  if (secondValue && phase === 'first-done') {
    setPhase('second-rolling');
  }

  // result 표시 후 자동 이동
  useEffect(() => {
    if (phase !== 'result') return;
    const timer = setTimeout(() => {
      setPhase('done');
      onAction('DOUBLE_DICE_COMPLETE');
    }, 1500);
    return () => clearTimeout(timer);
  }, [phase]);

  const total = firstValue && secondValue ? firstValue + secondValue : null;

  return (
    <div className="roll-dice-container">
      {/* 결과 표시 */}
      {phase === 'result' || phase === 'done' ? (
        <div className="double-dice-total">
          <img
            src={`/images/dice/dice-result-${total}.webp`}
            alt={total}
            className="double-dice-total-img"
          />
        </div>
      ) : (
        // 주사위 2개 영역
        <div className="double-dice-area">
          {/* 첫번째 주사위 */}
          <div className="double-dice-slot">
            {phase === 'first-rolling' || (firstValue && phase !== 'waiting') ? (
              <Dice3D value={firstValue} onAnimationEnd={() => setPhase('first-done')} />
            ) : (
              <div></div>
            )}
          </div>

          {/* 두번째 주사위 */}
          <div className="double-dice-slot">
            {phase === 'second-rolling' ? (
              <Dice3D value={secondValue} onAnimationEnd={() => setPhase('result')} />
            ) : (
              <div></div>
            )}
          </div>
        </div>
      )}

      <div className="character-area">
        <Shadow fill={true}>
          <img src={charImg} alt={player?.nickname} className="current-character" />
        </Shadow>
      </div>

      <InstructionText>
        {phase === 'first-rolling' || phase === 'second-rolling' || phase === 'result'
          ? ''
          : phase === 'first-done'
            ? isMyTurn
              ? '스페이스바를 눌러 두 번째 주사위 굴리기'
              : `${player?.nickname}${iGa(player?.nickname)} 두 번째 주사위를 굴리고 있어요`
            : isMyTurn
              ? '스페이스바를 눌러 첫 번째 주사위 굴리기'
              : `${player?.nickname}${iGa(player?.nickname)} 첫 번째 주사위를 굴리고 있어요`}
      </InstructionText>
    </div>
  );
};

export default DoubleDice;
