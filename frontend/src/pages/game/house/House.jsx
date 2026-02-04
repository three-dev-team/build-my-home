import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

import AspectLayout from '../../../components/layout/AspectLayout.jsx';
import ExitButton from '../../../components/common/ExitButton.jsx';

import { CHARACTERS } from '../../../constants/characters.js';
import { COLORS, withAlpha } from '../../../constants/colors.js';
import { HOUSE_LEVEL_MAP, normalizeHouseLevelByAny, roEuro } from '../../../constants/houseLevel.js';
import { RESOURCE_ORDER, getCount, koName } from '../../../constants/reward.js';

import './HouseCommon.css';
import HouseStep0 from './HouseStep0.jsx';
import HouseStep1Naugul from './HouseStep1Naugul.jsx';
import HouseStep2Materials from './HouseStep2Materials.jsx';
import HouseStep3Upgrade from './HouseStep3Upgrade.jsx';
import HouseStep4BuildFinish from './HouseStep4BuildFinish.jsx';

const px = (n) => `calc(${n} * var(--s))`;

const pickCharacter = (characterId) => {
  const id = Number(characterId);
  return CHARACTERS.find((c) => Number(c.id) === id) || null;
};

const getCurrentHouseLevel = (player) => {
  const cand = [player?.houseLevel, player?.house?.level, player?.house?.currentLevel, player?.homeLevel];
  const v = cand.find((x) => x !== undefined && x !== null);
  return normalizeHouseLevelByAny(v);
};

const pickLevelObj = (level) => (HOUSE_LEVEL_MAP || []).find((x) => Number(x.level) === Number(level)) || null;

const getOwnedBell = (player) => {
  const cand = [
    player?.bell,
    player?.money,
    player?.cash,
    player?.balance,
    player?.wallet,
    player?.coins,
    player?.currency,
    player?.resources?.bell,
    player?.inventory?.bell,
  ];
  const v = cand.find((x) => x !== undefined && x !== null);
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

const calcUpgradeRequirement = (player) => {
  const cur = getCurrentHouseLevel(player);
  const next = cur + 1;
  const nextObj = pickLevelObj(next);

  if (!nextObj) {
    return { hasAllMaterials: false, lackMessage: '이미 최고 레벨이라구리!', nextName: '최고 레벨' };
  }

  const nextName = nextObj?.name || `level ${next}`;
  const lacks = [];

  const needBell = Number(nextObj?.bell || 0);
  const ownedBell = getOwnedBell(player);
  const lackBell = Math.max(0, needBell - ownedBell);
  if (lackBell > 0) lacks.push(`${lackBell}벨이`);

  (RESOURCE_ORDER || []).forEach((K) => {
    const lower = String(K).toLowerCase();
    const need = Number(getCount(nextObj, lower) || 0);
    if (need <= 0) return;

    const ownedCandidate = [
      getCount(player, lower),
      getCount(player?.resources, lower),
      getCount(player?.inventory, lower),
      getCount(player?.reward, lower),
    ].find((v) => v !== undefined && v !== null);

    const owned = Number(ownedCandidate || 0);
    const lack = Math.max(0, need - owned);

    if (lack > 0) {
      const name = typeof koName === 'function' ? koName(K) : String(K);
      lacks.push(`${name} ${lack}개`);
    }
  });

  const hasAllMaterials = lacks.length === 0;

  let lackMessage = '';
  if (!hasAllMaterials) {
    const head = `${nextName}${roEuro(nextName)} 업그레이드 하려 왔나구리?\n`;
    lackMessage =
      lacks.length === 1 && /벨이$/.test(lacks[0])
        ? `${head}아직 ${lacks[0]} 더 필요하다구리.`
        : `${head}아직 ${lacks.join(' ')} 가 더 필요하다구리.`;
  }

  return { hasAllMaterials, lackMessage, nextName };
};

export default function House({ player, isMyTurn, onClose, onAction, onInventory, onATM }) {
  const step = Number(player?.uiStep ?? 0);

  const setStep = (newStep) => {
    if (!isMyTurn) return;
    onAction?.('SET_STEP', { uiStep: newStep });
  };

  const character = useMemo(() => pickCharacter(player?.characterId), [player?.characterId]);
  const { hasAllMaterials, lackMessage } = useMemo(() => calcUpgradeRequirement(player), [player]);

  const BG_BY_STEP = useMemo(
    () => ({
      0: '/images/board/bg-buildhouse-main.webp',
      1: '/images/board/bg-buildhouse-naugul.webp',
      2: '/images/board/bg-buildhouse-naugul.webp',
      3: '/images/board/bg-buildhouse-naugul.webp',
      4: '/images/board/bg-buildhouse-naugul.webp',
    }),
    [],
  );

  const PANEL_BG = useMemo(() => withAlpha(COLORS.ac.black, 0.55), []);
  const CARD_BG = useMemo(() => withAlpha(COLORS.ac.black, 0.35), []);

  const handleBack = () => {
    if (!isMyTurn) return;

    if (step === 4) return setStep(1);
    if (step >= 2) return setStep(1);
    if (step === 1) return setStep(0);

    onClose?.();
  };

  const canUpgrade = !!hasAllMaterials;
  const showExit = step !== 4 && (step !== 3 || !canUpgrade);

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
          <img src={BG_BY_STEP[step] || BG_BY_STEP[0]} alt="house-bg" draggable={false} className="houseBg" />

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
              onSelectUpgrade={() => setStep(3)}
              onSelectMaterials={() => setStep(2)}
            />
          )}

          {step === 2 && <HouseStep2Materials player={player} isMyTurn={isMyTurn} character={character} px={px} />}

          {step === 3 && (
            <HouseStep3Upgrade
              player={player}
              isMyTurn={isMyTurn}
              character={character}
              px={px}
              onBackToNaugul={() => setStep(1)}
              onConfirmUpgrade={() => {
                if (!isMyTurn) return;
                onAction?.('UPGRADE_HOUSE', {});
              }}
              hasAllMaterials={hasAllMaterials}
              lackMessage={lackMessage}
            />
          )}

          {step === 4 && (
            <HouseStep4BuildFinish
              player={player}
              isMyTurn={isMyTurn}
              character={character}
              px={px}
              onAutoNext={() => setStep(1)}
            />
          )}

          {showExit && (
            <ExitButton
              onClick={handleBack}
              disabled={!isMyTurn}
              style={{ position: 'absolute', right: px(30), bottom: px(28) }}
            />
          )}
        </div>
      </AspectLayout>
    </motion.div>
  );
}
