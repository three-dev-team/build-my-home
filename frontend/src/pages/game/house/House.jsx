import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

import AspectLayout from '../../../components/layout/AspectLayout.jsx';
import ExitButton from '../../../components/common/ExitButton.jsx';

import { CHARACTERS } from '../../../constants/characters.js';
import { COLORS, withAlpha } from '../../../constants/colors.js';
import { HOUSE_LEVEL_MAP, normalizeHouseLevelByAny } from '../../../constants/houseLevel.js';
import { roEuro } from '../../../utils/josa.js';

import './HouseCommon.css';
import HouseStep0 from './HouseStep0.jsx';
import HouseStep1Naugul from './HouseStep1Naugul.jsx';
import HouseStep2Materials from './HouseStep2Materials.jsx';
import HouseStep3Upgrade from './HouseStep3Upgrade.jsx';
import HouseStep4BuildFinish from './HouseStep4BuildFinish.jsx';

const px = (n) => `calc(${n} * var(--s))`;

const BG_BY_STEP = {
  0: '/images/board/bg-buildhouse-main.webp',
  1: '/images/board/bg-buildhouse-naugul.webp',
  2: '/images/board/bg-buildhouse-naugul.webp',
  3: '/images/board/bg-buildhouse-naugul.webp',
  4: '/images/board/bg-buildhouse-naugul.webp',
};

const pickCharacter = (characterId) => {
  const id = Number(characterId);
  return (Array.isArray(CHARACTERS) ? CHARACTERS : []).find((c) => Number(c?.id) === id) || null;
};

const getCurrentHouseLevel = (player) => {
  const cand = [player?.houseLevel, player?.house?.level, player?.house?.currentLevel, player?.homeLevel];
  const v = cand.find((x) => x !== undefined && x !== null);
  return normalizeHouseLevelByAny(v);
};

const pickLevelObj = (level) => (HOUSE_LEVEL_MAP || []).find((x) => Number(x?.level) === Number(level)) || null;

const getOwnedBell = (player) => {
  const cand = [player?.bell, player?.money, player?.coins, player?.balance];
  const v = cand.find((x) => x !== undefined && x !== null);
  const n = Number(v ?? 0);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

const getOwnedResource = (player, keyUpper) => {
  const up = String(keyUpper ?? '').trim();
  const low = up.toLowerCase();

  const res = player?.resources;
  if (!res) return 0;

  const v1 = res?.[up];
  if (typeof v1 === 'number') return v1;

  const v2 = res?.[low];
  if (typeof v2 === 'number') return v2;

  const n = Number(v1 ?? v2 ?? 0);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

const getMissingResource = (player, keyUpper, nextObj) => {
  const up = String(keyUpper ?? '').trim();
  const low = up.toLowerCase();

  const req = player?.requiredResourcesForNextHouse;
  if (req && typeof req === 'object') {
    const v1 = req?.[up];
    if (typeof v1 === 'number') return Math.max(0, v1);

    const v2 = req?.[low];
    if (typeof v2 === 'number') return Math.max(0, v2);

    const n = Number(v1 ?? v2);
    if (Number.isFinite(n)) return Math.max(0, n);
  }

  const total = Number(nextObj?.[up] ?? nextObj?.[low] ?? 0);
  const owned = getOwnedResource(player, up);
  const miss = Math.max(0, (Number.isFinite(total) ? total : 0) - owned);
  return miss;
};

const KO_RESOURCE = {
  WOOD: '목재',
  IRON: '철광석',
  CLOTH: '천',
  BRICK: '벽돌',
  WALLPAPER: '벽지',
  CLAY: '점토',
  FLOORING: '바닥재',
};

// 업그레이드 가능 여부/부족 문구 계산(서버 requiredResources 우선, 없으면 nextObj 기반 계산)
const calcUpgradeRequirement = (player) => {
  const cur = getCurrentHouseLevel(player);

  const nextFromServer = player?.nextHouseLevel;
  const nextLv = nextFromServer != null ? normalizeHouseLevelByAny(nextFromServer) : cur + 1;

  const nextObj = pickLevelObj(nextLv);

  if (!nextObj) {
    return {
      hasAllMaterials: false,
      lackMessage: '이미 최고 레벨이라구리!',
      nextName: '최고 레벨',
    };
  }

  const nextName = nextObj?.name || `level ${nextLv}`;
  const lacks = [];

  const needBell = Number(nextObj?.bell ?? 0);
  const ownedBell = getOwnedBell(player);
  const lackBell = Math.max(0, needBell - ownedBell);
  if (lackBell > 0) lacks.push(`${lackBell}벨`);

  const RESOURCE_KEYS = ['WOOD', 'IRON', 'CLOTH', 'BRICK', 'WALLPAPER', 'CLAY', 'FLOORING'];
  RESOURCE_KEYS.forEach((K) => {
    const missing = getMissingResource(player, K, nextObj);
    if (missing <= 0) return;

    const nm = KO_RESOURCE[K] || K;
    lacks.push(`${nm} ${missing}개`);
  });

  const serverCan = player?.canUpgradeHouse;
  const hasAllMaterials = typeof serverCan === 'boolean' ? serverCan : lacks.length === 0;

  let lackMessage = '';
  if (!hasAllMaterials) {
    const head = `${nextName}${roEuro(nextName)} 업그레이드 하려 왔나구리?\n`;
    if (lacks.length === 0) {
      lackMessage = `${head}아직 재료가 더 필요하다구리.`;
    } else if (lacks.length === 1) {
      lackMessage = `${head}아직 ${lacks[0]} 더 필요하다구리.`;
    } else {
      lackMessage = `${head}아직 ${lacks.join(' ')} 더 필요하다구리.`;
    }
  }

  return { hasAllMaterials, lackMessage, nextName };
};

export default function House({
                                player,
                                materialsPlayer,
                                isMyTurn,
                                isSpectator = false,
                                onClose,
                                onAction,
                                onInventory,
                                onATM,
                              }) {
  const step = Number(player?.uiStep ?? 0);

  // 내 턴 + 비관전일 때만 단계 이동/액션 가능
  const canInteract = !!isMyTurn && !isSpectator;

  const setStep = (newStep) => {
    if (!canInteract) return;
    onAction?.('SET_STEP', { uiStep: newStep });
  };

  const character = useMemo(() => pickCharacter(player?.characterId), [player?.characterId]);

  // 재료 표시는 내 턴이면 materialsPlayer 우선(없으면 player)
  const matPlayer = isMyTurn ? (materialsPlayer || player) : player;
  const { hasAllMaterials, lackMessage } = useMemo(() => calcUpgradeRequirement(matPlayer), [matPlayer]);

  const PANEL_BG = withAlpha(COLORS.ac.black, 0.55);
  const CARD_BG = withAlpha(COLORS.ac.black, 0.35);

  const handleBack = () => {
    if (!canInteract) return;

    if (step === 4) return setStep(1);
    if (step >= 2) return setStep(1);
    if (step === 1) return setStep(0);

    onClose?.();
  };

  const canUpgrade = !!hasAllMaterials;

  // Step4(완료 화면)에서는 Exit 숨김, Step3에서는 업그레이드 가능하면 Exit 숨김
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
                if (!canInteract) return;
                onAction?.('UPGRADE_HOUSE', {});
              }}
              hasAllMaterials={hasAllMaterials}
              lackMessage={lackMessage}
            />
          )}

          {step === 4 && (
            <HouseStep4BuildFinish
              player={player}
              character={character}
              // Step4 OK: (1) 즉시 CLOSE, (2) 3초 뒤 FINAL 전송
              onCloseNow={() => {
                if (!canInteract) return;
                onAction?.('HOUSE_FINISH_OK', { actionDataStr: 'CLOSE' });
              }}
              onFinishAfter3s={() => {
                if (!canInteract) return;
                onAction?.('HOUSE_FINISH_OK', { actionDataStr: 'FINAL' });
              }}
              isSpectator={isSpectator || !isMyTurn}
            />
          )}

          {showExit && (
            <ExitButton
              onClick={handleBack}
              disabled={!canInteract}
              style={{ position: 'absolute', right: px(30), bottom: px(28) }}
            />
          )}
        </div>
      </AspectLayout>
    </motion.div>
  );
}
