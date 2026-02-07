import React from 'react';
import { useGameTimer } from '../../../hooks/useGameTimer.js';
import { useExitHandler } from '../../../hooks/useExitHandler.js';
import IntroScreen from './IntroScreen.jsx';
import CardSelectScreen from './CardSelectScreen.jsx';
import ResultScreen from './ResultScreen.jsx';
import FadeBlurTransition from '../../../components/common/FadeBlurTransition.jsx';

const BG_COLOR = '#1a0a2e';

const Machurilla = ({ isMyTurn = false, player, currentPlayerName = '익명의 주민', onAction, onExit }) => {
  const step = player?.uiStep || 0;
  const result = player?.actionDataStr;

  const handleExit = useExitHandler(isMyTurn, onExit);
  useGameTimer(isMyTurn && step === 6 ? 5 : null, handleExit);

  const setStep = (newStep) => {
    if (!isMyTurn) return;
    onAction('SET_STEP', { uiStep: newStep });
  };

  const handleSelect = () => {
    if (!isMyTurn) return;
    onAction('MACHURILLA_SELECT', {});
  };

  // intro: 0,1,2 / card: 3 / result: 4,5,6
  const getStageKey = () => {
    if (step <= 2) return 'intro';
    if (step === 3) return 'card';
    return 'result';
  };

  return (
    <FadeBlurTransition stageKey={getStageKey()} bgColor={BG_COLOR}>
      {step <= 2 && (
        <IntroScreen
          step={step}
          setStep={setStep}
          onSelect={handleSelect}
          isMyTurn={isMyTurn}
          currentPlayerName={currentPlayerName}
          characterId={player?.characterId}
        />
      )}
      {step === 3 && <CardSelectScreen isMyTurn={isMyTurn} player={player} onSelect={() => setStep(4)} />}
      {step >= 4 && <ResultScreen step={step} setStep={setStep} result={result} isMyTurn={isMyTurn} />}
    </FadeBlurTransition>
  );
};

export default Machurilla;
