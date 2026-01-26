import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DiscoverScreen from './DiscoverScreen.jsx';
import { useExitHandler } from '../../../hooks/useExitHandler.js';
import SelectScreen from './SelectScreen.jsx';
import GetScreen from './GetScreen.jsx';
import { useGameTimer } from '../../../hooks/useGameTimer.js';
import CompleteScreen from './CompleteScreen.jsx';

const ItemTile = ({ isMyTurn, player, onAction, onExit }) => {
  const playerName = player?.nickname || '익명의 주민';
  const step = player?.uiStep || 0;
  const item = player?.actionDataStr; // 획득한 아이템 키
  const inventory = player?.items || [];

  // step 2, 3: 3초 후 자동 종료
  const handleExit = useExitHandler(isMyTurn, onExit);
  useGameTimer(isMyTurn && (step === 2 || step === 3) ? 3 : null, handleExit);

  // 배경 이미지 스타일
  const bgStyle = {
    backgroundImage: 'url(/images/item/item-drop-bg.jpeg)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };

  return (
    <div className="fixed inset-0 w-screen h-screen z-[100] flex flex-col overflow-hidden" style={bgStyle}>
      <AnimatePresence mode="wait">
        {step === 0 && <DiscoverScreen key="step0" playerName={playerName} isMyTurn={isMyTurn} onAction={onAction} />}
        {step === 1 && (
          <SelectScreen
            key="step1"
            playerName={playerName}
            newItem={item}
            inventory={inventory}
            isMyTurn={isMyTurn}
            selectedIdx={player?.actionData}
            onAction={onAction}
          />
        )}
        {step === 2 && (
          <GetScreen key="step2" playerName={playerName} newItem={item} inventory={inventory} onAction={onAction} />
        )}
        {step === 3 && (
          <CompleteScreen key="step3" playerName={playerName} item={item} isMyTurn={isMyTurn} handleExit={handleExit} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ItemTile;
