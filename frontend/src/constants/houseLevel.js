export const HOUSE_LEVEL_MAP = [
  { level: 0, key: 'NONE', name: '없음', bell: 0 },
  { level: 1, key: 'LAND', name: '땅', bell: 300 },
  { level: 2, key: 'TENT', name: '텐트', bell: 400, cloth: 1, iron: 1 },
  { level: 3, key: 'HOUSE_1', name: '집(1)', bell: 1000, iron: 1, clay: 1 },
  { level: 4, key: 'HOUSE_2', name: '집(2)', bell: 1800, iron: 3, clay: 3, wood: 3, brick: 3 },
  { level: 5, key: 'HOUSE_3', name: '집(3)', bell: 3000, iron: 5, clay: 5, brick: 5, wallpaper: 5, flooring: 5 },
];

// key -> 레벨 상세(빠른 조회용)
export const HOUSE_DETAILS = HOUSE_LEVEL_MAP.reduce((acc, curr) => {
  acc[curr.key] = curr;
  return acc;
}, {});

// 리소스 표시용(이름/아이콘)
export const RESOURCE_MAP = {
  WOOD: { icon: '🪵', name: '목재' },
  IRON: { icon: '⛏️', name: '철광석' },
  CLOTH: { icon: '🧵', name: '천' },
  BRICK: { icon: '🧱', name: '벽돌' },
  WALLPAPER: { icon: '🎨', name: '벽지' },
  CLAY: { icon: '🪨', name: '점토' },
  FLOORING: { icon: '🪵', name: '바닥' },
};

// 리소스 enum("IRON") -> 하우스 요구 필드명("iron") 변환
export const toHouseReqKey = (resourceKey) => {
  if (!resourceKey) return null;
  const s = String(resourceKey).trim();
  if (!s) return null;
  return s.toLowerCase();
};

// 현재 레벨 숫자 -> 다음 레벨 객체 반환(없으면 null)
export const getNextHouseLevelByLevel = (currentLevel) => {
  const lv = Number(currentLevel);
  if (!Number.isFinite(lv)) return null;

  return HOUSE_LEVEL_MAP.find((x) => x.level === lv + 1) || null;
};

// 특정 레벨에 해당 리소스가 요구 재료인지 확인
export const isResourceNeededForLevel = (levelObj, resourceKey) => {
  if (!levelObj || !resourceKey) return false;

  const reqKey = toHouseReqKey(resourceKey);
  if (!reqKey) return false;

  const v = levelObj[reqKey];
  return typeof v === 'number' && v > 0;
};

// dropKeys 중 다음 레벨에 필요한 재료가 하나라도 있는지 판정
export const isAnyRewardNeededForNextLevel = (viewerHouseLevel, dropKeys = []) => {
  const next = getNextHouseLevelByLevel(viewerHouseLevel);
  if (!next) return { nextLevel: null, isNeeded: false };

  const keys = Array.isArray(dropKeys) ? dropKeys : [];
  const isNeeded = keys.some((k) => isResourceNeededForLevel(next, k));
  return { nextLevel: next, isNeeded };
};
