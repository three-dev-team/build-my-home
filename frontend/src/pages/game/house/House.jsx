// House.jsx (풀코드) ✅ 업그레이드 판정/부족문구/재화키(대소문자) 싹 정리 + "가" 단독/공백 버그 방지
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

import AspectLayout from '../../../components/layout/AspectLayout.jsx';
import ExitButton from '../../../components/common/ExitButton.jsx';

import { CHARACTERS } from '../../../constants/characters.js';
import { COLORS, withAlpha } from '../../../constants/colors.js';
import { HOUSE_LEVEL_MAP, normalizeHouseLevelByAny } from '../../../constants/houseLevel.js';

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

// ✅ bell 필드 호환(서버/과거 혼재 방어)
const getOwnedBell = (player) => {
  const cand = [player?.bell, player?.money, player?.coins, player?.balance];
  const v = cand.find((x) => x !== undefined && x !== null);
  const n = Number(v ?? 0);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

// ✅ resources: EnumMap -> JSON { WOOD: 1, ... }가 일반적
// 과거/클라에서 소문자 키로도 올 수 있어서 둘 다 지원
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

// ✅ requiredResourcesForNextHouse: EnumMap -> JSON { WOOD: 2, ... } 우선 사용
// 없으면 nextObj(프론트 상수: wood/iron...)로 fallback
const getRequiredResource = (player, keyUpper, nextObj) => {
  const up = String(keyUpper ?? '').trim();
  const low = up.toLowerCase();

  const req = player?.requiredResourcesForNextHouse;
  if (req) {
    const v1 = req?.[up];
    if (typeof v1 === 'number') return v1;

    const v2 = req?.[low];
    if (typeof v2 === 'number') return v2;

    const n = Number(v1 ?? v2);
    if (Number.isFinite(n) && n >= 0) return n;
  }

  // fallback: 프론트 상수
  const nf = Number(nextObj?.[low] ?? 0);
  return Number.isFinite(nf) && nf >= 0 ? nf : 0;
};

// ✅ 부족 메시지에서 사용할 한글명(고정)
const KO_RESOURCE = {
  WOOD: '목재',
  IRON: '철광석',
  CLOTH: '천',
  BRICK: '벽돌',
  WALLPAPER: '벽지',
  CLAY: '점토',
  FLOORING: '바닥재',
};

// ✅ 업그레이드 요구조건 계산(서버 bool/nextHouseLevel 있으면 최우선 반영)
const calcUpgradeRequirement = (player) => {
  const cur = getCurrentHouseLevel(player);

  // nextHouseLevel(enum) 있으면 그걸 따름(없으면 cur+1)
  const nextFromServer = player?.nextHouseLevel;
  const nextLv = nextFromServer != null ? normalizeHouseLevelByAny(nextFromServer) : cur + 1;

  const nextObj = pickLevelObj(nextLv);

  if (!nextObj) {
    // 최고 레벨
    return {
      hasAllMaterials: false,
      lackMessage: '이미 최고 레벨이라구리!',
      nextName: '최고 레벨',
    };
  }

  const nextName = nextObj?.name || `level ${nextLv}`;
  const lacks = [];

  // bell 부족
  const needBell = Number(nextObj?.bell ?? 0);
  const ownedBell = getOwnedBell(player);
  const lackBell = Math.max(0, needBell - ownedBell);
  if (lackBell > 0) lacks.push(`${lackBell}벨`);

  // resource 부족(서버 요구사항 우선)
  const RESOURCE_KEYS = ['WOOD', 'IRON', 'CLOTH', 'BRICK', 'WALLPAPER', 'CLAY', 'FLOORING'];
  RESOURCE_KEYS.forEach((K) => {
    const need = getRequiredResource(player, K, nextObj);
    if (need <= 0) return;

    const owned = getOwnedResource(player, K);
    const lack = Math.max(0, need - owned);

    if (lack > 0) {
      const nm = KO_RESOURCE[K] || K;
      lacks.push(`${nm} ${lack}개`);
    }
  });

  // ✅ 서버 canUpgradeHouse가 있으면 그걸 최우선(진짜 판정은 서버)
  const serverCan = player?.canUpgradeHouse;
  const hasAllMaterials = typeof serverCan === 'boolean' ? serverCan : lacks.length === 0;

  // ✅ "아직 가 더 필요" / " ... 가" 공백 버그 방지
  let lackMessage = '';
  if (!hasAllMaterials) {
    const head = `${nextName}로 업그레이드 하려 왔나구리?\n`;
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
                                materialsPlayer, // ✅ 추가: 내 재화(업그레이드 판정용)
                                isMyTurn,
                                onClose,
                                onAction,
                                onInventory,
                                onATM,
                              }) {
  const step = Number(player?.uiStep ?? 0);

  const setStep = (newStep) => {
    if (!isMyTurn) return;
    onAction?.('SET_STEP', { uiStep: newStep });
  };

  const character = useMemo(() => pickCharacter(player?.characterId), [player?.characterId]);

  // ✅ 핵심: 업그레이드 판정/부족문구는 "내 턴이면 내 재화"로 계산
  const matPlayer = isMyTurn ? (materialsPlayer || player) : player;

  const { hasAllMaterials, lackMessage } = useMemo(() => calcUpgradeRequirement(matPlayer), [matPlayer]);

  const PANEL_BG = withAlpha(COLORS.ac.black, 0.55);
  const CARD_BG = withAlpha(COLORS.ac.black, 0.35);

  const handleBack = () => {
    if (!isMyTurn) return;

    if (step === 4) return setStep(1);
    if (step >= 2) return setStep(1);
    if (step === 1) return setStep(0);

    onClose?.();
  };

  // ✅ 기존 로직 유지
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
