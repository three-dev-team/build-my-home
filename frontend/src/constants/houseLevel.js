const BASE = {
  board: '/images/board',
};

export const HOUSE_LEVEL_MAP = [
  { level: 0, key: 'NONE', name: '없음', bell: 0, icon: null },
  { level: 1, key: 'LAND', name: '땅', bell: 300, icon: `${BASE.board}/land.webp` },
  { level: 2, key: 'TENT', name: '텐트', bell: 400, cloth: 1, iron: 1, icon: `${BASE.board}/tent.webp` },
  { level: 3, key: 'HOUSE_1', name: '집(1)', bell: 1000, iron: 1, clay: 1, icon: `${BASE.board}/house_1.webp` },
  { level: 4, key: 'HOUSE_2', name: '집(2)', bell: 1800, iron: 3, clay: 3, wood: 3, brick: 3, icon: `${BASE.board}/house_2.webp` },
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

export const getHouseIconByLevel = (levelOrKey) => {
  if (levelOrKey === null || levelOrKey === undefined) return null;

  // 1) 문자열 키로 온 경우: "LAND", "TENT", ...
  if (typeof levelOrKey === 'string') {
    const key = levelOrKey.trim();
    if (!key) return null;

    const byKey = HOUSE_DETAILS[key];
    if (byKey?.icon) return byKey.icon;

    // 문자열인데 숫자처럼 온 경우("2" 등)도 처리
    const asNum = Number(key);
    if (Number.isFinite(asNum)) {
      const obj = HOUSE_LEVEL_MAP.find((x) => x.level === asNum) || null;
      return obj?.icon || null;
    }

    return null;
  }

  // 2) 숫자 레벨로 온 경우: 0~4
  const lv = Number(levelOrKey);
  if (!Number.isFinite(lv)) return null;

  const obj = HOUSE_LEVEL_MAP.find((x) => x.level === lv) || null;
  return obj?.icon || null;
};
