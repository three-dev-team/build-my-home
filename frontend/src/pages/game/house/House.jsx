import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import AspectLayout from '../../../components/layout/AspectLayout.jsx';
import ExitButton from '../../../components/common/ExitButton.jsx';
import { CHARACTERS } from '../../../constants/characters.js';

import HouseStep0 from './HouseStep0.jsx';
import HouseStep1Naugul from './HouseStep1Naugul.jsx';

const px = (n) => `calc(${n} * var(--s))`;

const pickCharacter = (characterId) => {
  const id = Number(characterId);
  return CHARACTERS.find((c) => Number(c.id) === id) || null;
};

export default function House({ player, isMyTurn, onClose, onAction, onInventory, onATM }) {
  const step = player?.uiStep ?? 0;

  const setStep = (newStep) => {
    if (!isMyTurn) return;
    onAction?.('SET_STEP', { uiStep: newStep });
  };

  const character = useMemo(() => pickCharacter(player?.characterId), [player?.characterId]);

  // ✅ step에 따라 배경 교체
  const BG_BY_STEP = {
    0: '/images/board/bg-buildhouse-augul.webp',
    1: '/images/board/bg-buildhouse-naugul.webp',
  };

  const BG_PRIMARY = BG_BY_STEP[step] || '/images/board/bg-buildhouse-augul.webp';
  const BG_FALLBACK = '/images/board/bg-buildhouse-main.webp';

  // ✅ "뒤로가기" 버튼 동작: step>0이면 step0으로, step0이면 House 닫기
  const handleBack = () => {
    if (!isMyTurn) return;

    if (step > 0) {
      setStep(0);
      return;
    }

    onClose?.();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[30000]">
      <AspectLayout>
        <div
          className="relative w-full h-full overflow-hidden"
          style={{
            containerType: 'size',
            ['--s']: 'calc(100cqw / 1920)',
          }}
        >
          <img
            key={BG_PRIMARY}
            src={BG_PRIMARY}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = BG_FALLBACK;
            }}
            alt="buildhouse-bg"
            draggable={false}
            className="absolute inset-0 w-full h-full object-cover"
          />

          {step === 0 && (
            <HouseStep0
              player={player}
              isMyTurn={isMyTurn}
              character={character}
              px={px}
              onInventory={onInventory}
              onATM={onATM}
              onOpenNaugul={() => setStep(1)}
            />
          )}

          {step === 1 && (
            <HouseStep1Naugul
              player={player}
              isMyTurn={isMyTurn}
              character={character}
              px={px}
              onSelectUpgrade={() => setStep(2)}
              onSelectMaterials={() => setStep(3)}
              onBack={() => setStep(0)}
            />
          )}

          {/* step 2~4 자리 */}
          {step !== 0 && step !== 1 && (
            <div className="absolute inset-0">
              {/* TODO: step 2~4 */}
            </div>
          )}

          {/* ✅ ExitButton = 뒤로가기 버튼으로만 사용 + shadow 항상 OFF */}
          <ExitButton
            onClick={handleBack}
            label="뒤로가기"
            showShadow={false}
            className=""
            disabled={!isMyTurn}
            style={{
              position: 'absolute',
              right: px(30),
              bottom: px(28),
              zIndex: 10,
            }}
          />
        </div>
      </AspectLayout>
    </motion.div>
  );
}
