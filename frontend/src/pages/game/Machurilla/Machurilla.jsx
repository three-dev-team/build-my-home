// uiStep 0: NPC 소개
// uiStep 1: 카드 4개 선택
// uiStep 2: 결과 화면
import React from 'react';
import { motion } from 'framer-motion';
import { useGameTimer } from '../../../hooks/useGameTimer.js';
import { useExitHandler } from '../../../hooks/useExitHandler.js';
import IntroScreen from './IntroScreen.jsx';
import CardSelectScreen from './CardSelectScreen.jsx';
import ResultScreen from './ResultScreen.jsx';

const Machurilla = ({ isMyTurn = false, player, currentPlayerName = '익명의 주민', onAction, onExit }) => {
  const step = player?.uiStep || 0;
  const result = player?.actionDataStr;

  const handleExit = useExitHandler(isMyTurn, onExit);
  useGameTimer(isMyTurn && step === 2 ? 5 : null, handleExit);

  const setStep = (newStep) => {
    if (!isMyTurn) return;
    onAction('SET_STEP', { uiStep: newStep });
  };

  const handleCardSelect = (cardType) => {
    if (!isMyTurn) return;
    onAction('MACHURILLA_SELECT', { actionDataStr: cardType });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 w-screen h-screen flex flex-col items-center justify-center z-[100] overflow-hidden bg-purple-900"
    >
      {step === 0 && (
        <IntroScreen onNext={() => setStep(1)} isMyTurn={isMyTurn} currentPlayerName={currentPlayerName} />
      )}
      {step === 1 && <CardSelectScreen onSelect={handleCardSelect} isMyTurn={isMyTurn} />}
      {step === 2 && <ResultScreen result={result} />}
    </motion.div>
  );
};

export default Machurilla;
