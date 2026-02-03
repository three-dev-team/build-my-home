import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import AspectLayout from '../../../components/layout/AspectLayout.jsx';
import ExitButton from '../../../components/common/ExitButton.jsx';
import { CHARACTERS } from '../../../constants/characters.js';
import { COLORS, withAlpha } from '../../../constants/colors.js';

import './HouseCommon.css';

import HouseStep0 from './HouseStep0.jsx';
import HouseStep1Naugul from './HouseStep1Naugul.jsx';
import HouseStep2Materials from './HouseStep2Materials.jsx';

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

  const BG_BY_STEP = {
    0: '/images/board/bg-buildhouse-main.webp',
    1: '/images/board/bg-buildhouse-naugul.webp',
    2: '/images/board/bg-buildhouse-naugul.webp',
  };

  const PANEL_BG = withAlpha(COLORS.ac.black, 0.55);
  const CARD_BG = withAlpha(COLORS.ac.black, 0.35);

  const handleBack = () => {
    if (!isMyTurn) return;

    if (step >= 2) return setStep(1);
    if (step === 1) return setStep(0);
    onClose?.();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="houseOverlay">
      <AspectLayout>
        <div
          className="houseStage"
          style={{
            ['--s']: 'calc(100cqw / 1920)',
            ['--house-panel-bg']: PANEL_BG,
            ['--house-card-bg']: CARD_BG,
            ['--house-white']: COLORS.ac.white,
          }}
        >
          <img
            src={BG_BY_STEP[step]}
            alt="house-bg"
            draggable={false}
            className="houseBg"
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
              onSelectMaterials={() => setStep(2)}
            />
          )}

          {step === 2 && (
            <HouseStep2Materials
              player={player}
              isMyTurn={isMyTurn}
              character={character}
              px={px}
            />
          )}

          <ExitButton
            onClick={handleBack}
            disabled={!isMyTurn}
            style={{ position: 'absolute', right: px(30), bottom: px(28) }}
          />
        </div>
      </AspectLayout>
    </motion.div>
  );
}
