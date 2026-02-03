import { CHARACTERS } from './characters.js';

const BASE = {
  board: '/images/board',
};

// characterId로 CHARACTERS에서 houseImage 찾기
const getHouseImageFromCharacter = (characterId) => {
  const id = Number(characterId);
  if (!Number.isFinite(id)) return null;

  const c = (Array.isArray(CHARACTERS) ? CHARACTERS : []).find((x) => Number(x?.id) === id) || null;
  const img = c?.houseImage;

  if (typeof img === 'string' && img.trim()) return img.trim();
  return null;
};

export const HOUSE_LEVEL_MAP = [
  { level: 0, key: 'NONE', name: '없음', bell: 0, icon: null },
  { level: 1, key: 'LAND', name: '땅', bell: 300, icon: `${BASE.board}/land.webp` },
  { level: 2, key: 'TENT', name: '텐트', bell: 500, cloth: 1, iron: 1, icon: `${BASE.board}/tent.webp` },
  { level: 3, key: 'HOUSE_1', name: '작은집', bell: 1000, iron: 2, clay: 2, wood: 2,icon: `${BASE.board}/house_1.webp` },
  { level: 4, key: 'HOUSE_2', name: '큰집', bell: 1800, iron: 3, clay: 3, wood: 3, brick: 3, icon: `${BASE.board}/house_2.webp` },
  { level: 5, key: 'MYHOME', name: '마이홈', bell: 3000, iron: 5, clay: 5, brick: 5, cloth: 5, wallpaper: 5, flooring: 5, icon: null },
];

export const HOUSE_DETAILS = HOUSE_LEVEL_MAP.reduce((acc, curr) => {
  acc[curr.key] = curr;
  return acc;
}, {});

export const toHouseReqKey = (resourceKey) => {
  if (!resourceKey) return null;
  const s = String(resourceKey).trim();
  if (!s) return null;
  return s.toLowerCase();
};

export const getNextHouseLevelByLevel = (currentLevel) => {
  const lv = Number(currentLevel);
  if (!Number.isFinite(lv)) return null;
  return HOUSE_LEVEL_MAP.find((x) => x.level === lv + 1) || null;
};

export const isResourceNeededForLevel = (levelObj, resourceKey) => {
  if (!levelObj || !resourceKey) return false;

  const reqKey = toHouseReqKey(resourceKey);
  if (!reqKey) return false;

  const v = levelObj[reqKey];
  return typeof v === 'number' && v > 0;
};

export const isAnyRewardNeededForNextLevel = (viewerHouseLevel, dropKeys = []) => {
  const next = getNextHouseLevelByLevel(viewerHouseLevel);
  if (!next) return { nextLevel: null, isNeeded: false };

  const keys = Array.isArray(dropKeys) ? dropKeys : [];
  const isNeeded = keys.some((k) => isResourceNeededForLevel(next, k));
  return { nextLevel: next, isNeeded };
};

export const getHouseIconByLevel = (levelOrKey, characterId = null) => {
  if (levelOrKey === null || levelOrKey === undefined) return null;

  // 1) 문자열 키로 온 경우: "LAND", "TENT", "MYHOME", ...
  if (typeof levelOrKey === 'string') {
    const key = levelOrKey.trim();
    if (!key) return null;
    if (key === 'MYHOME') {
      return getHouseImageFromCharacter(characterId);
    }

    const byKey = HOUSE_DETAILS[key];
    if (byKey?.icon) return byKey.icon;

    // 문자열인데 숫자처럼 온 경우("2" 등)도 처리
    const asNum = Number(key);
    if (Number.isFinite(asNum)) {
      if (asNum === 5) return getHouseImageFromCharacter(characterId);
      const obj = HOUSE_LEVEL_MAP.find((x) => x.level === asNum) || null;
      return obj?.icon || null;
    }

    return null;
  }
  // 2) 숫자 레벨로 온 경우: 0~5
  const lv = Number(levelOrKey);
  if (!Number.isFinite(lv)) return null;
  if (lv === 5) {
    return getHouseImageFromCharacter(characterId);
  }
  const obj = HOUSE_LEVEL_MAP.find((x) => x.level === lv) || null;
  return obj?.icon || null;
};
