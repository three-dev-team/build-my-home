import { CHARACTERS } from './characters.js';

const BASE = { board: '/images/board' };

export const HOUSE_LEVEL_MAP = [
  { level: 0, key: 'NONE', name: '없음', bell: 0, icon: null },
  { level: 1, key: 'LAND', name: '땅', bell: 300, icon: `${BASE.board}/land.webp` },
  { level: 2, key: 'TENT', name: '텐트', bell: 500, CLOTH: 1, IRON: 1, icon: `${BASE.board}/tent.webp` },
  { level: 3, key: 'HOUSE_1', name: '작은집', bell: 1000, IRON: 2, CLAY: 2, WOOD: 2, icon: `${BASE.board}/house_1.webp` },
  { level: 4, key: 'HOUSE_2', name: '큰집', bell: 1800, IRON: 3, CLAY: 3, WOOD: 3, BRICK: 3, icon: `${BASE.board}/house_2.webp` },
  { level: 5, key: 'MYHOME', name: '마이홈', bell: 3000, IRON: 5, CLAY: 5, BRICK: 5, CLOTH: 5, WALLPAPER: 5, FLOORING: 5, icon: null },
];

export const HOUSE_DETAILS = HOUSE_LEVEL_MAP.reduce((acc, cur) => {
  acc[cur.key] = cur;
  return acc;
}, {});

/* 서버/과거 enum 호환 */
const HOUSE_LEVEL_ALIASES = { HOUSE_3: 'MYHOME' };

/* MYHOME 전용: 캐릭터별 houseImage 사용 */
const getHouseImageFromCharacter = (characterId) => {
  const id = Number(characterId);
  if (!Number.isFinite(id)) return null;

  const list = Array.isArray(CHARACTERS) ? CHARACTERS : [];
  const c = list.find((x) => Number(x?.id) === id) || null;

  const img = c?.houseImage;
  return typeof img === 'string' && img.trim() ? img.trim() : null;
};

/* levelOrKey(숫자/숫자문자열/enum key)를 key로 정규화 */
const normalizeHouseKey = (levelOrKey) => {
  if (levelOrKey == null) return null;

  const asNum = Number(levelOrKey);
  if (Number.isFinite(asNum)) return HOUSE_LEVEL_MAP.find((x) => x.level === asNum)?.key ?? null;

  const raw = String(levelOrKey).trim();
  if (!raw) return null;

  const upper = raw.toUpperCase();
  const key = HOUSE_LEVEL_ALIASES[upper] || upper;

  return HOUSE_DETAILS[key] ? key : null;
};

/* levelOrKey(숫자/키/enum)를 level 숫자로 정규화 */
const normalizeHouseLevel = (levelOrKey) => {
  if (levelOrKey == null) return null;

  const asNum = Number(levelOrKey);
  if (Number.isFinite(asNum)) return asNum;

  const key = normalizeHouseKey(levelOrKey);
  if (!key) return null;

  const lv = HOUSE_DETAILS[key]?.level;
  return typeof lv === 'number' ? lv : null;
};

export const normalizeHouseLevelByAny = (levelOrKey) => {
  const n = normalizeHouseLevel(levelOrKey);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

export const getNextHouseLevelByLevel = (currentLevel) => {
  const lv = normalizeHouseLevel(currentLevel);
  if (!Number.isFinite(lv)) return null;
  return HOUSE_LEVEL_MAP.find((x) => x.level === lv + 1) || null;
};

const META_KEYS = new Set(['level', 'key', 'name', 'bell', 'icon']);

const toUpperKey = (k) => {
  const s = String(k ?? '').trim();
  return s ? s.toUpperCase() : null;
};

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/* nextLevel 객체에서 요구 재료만 { KEY: qty }로 뽑기 */
export const getRequiredResourcesOfLevel = (levelObj) => {
  if (!levelObj || typeof levelObj !== 'object') return {};

  const out = {};
  for (const k of Object.keys(levelObj)) {
    if (META_KEYS.has(k)) continue;

    const key = toUpperKey(k);
    const qty = toNum(levelObj[k]);

    if (!key) continue;
    if (qty > 0) out[key] = qty;
  }
  return out;
};

const isResourceNeededForLevel = (levelObj, resourceKey, ownedResources = null) => {
  const key = toUpperKey(resourceKey);
  if (!levelObj || !key) return false;

  const reqMap = getRequiredResourcesOfLevel(levelObj);
  const requiredQty = toNum(reqMap[key]);

  if (requiredQty <= 0) return false;

  // 기존 호환(보유량 없으면 "요구재료면 필요"로만 판단)
  if (!ownedResources || typeof ownedResources !== 'object') return true;

  const ownedQty = toNum(ownedResources[key]); // 서버 Map(ResourceType) 직렬화 => 대문자 키
  return ownedQty < requiredQty;
};

export const isAnyRewardNeededForNextLevel = (viewerHouseLevel, dropKeys = [], ownedResources = null) => {
  const next = getNextHouseLevelByLevel(viewerHouseLevel);
  if (!next) return { nextLevel: null, isNeeded: false };

  const keys = Array.isArray(dropKeys) ? dropKeys : [];
  const isNeeded = keys.some((k) => isResourceNeededForLevel(next, k, ownedResources));

  return { nextLevel: next, isNeeded };
};

export const getHouseIconByLevel = (levelOrKey, characterId = null) => {
  const key = normalizeHouseKey(levelOrKey);
  if (!key) return null;

  if (key === 'MYHOME') return getHouseImageFromCharacter(characterId);
  return HOUSE_DETAILS[key]?.icon ?? null;
};
