import { CHARACTERS } from './characters.js';

const BASE = { board: '/images/board' };

export const HOUSE_LEVEL_MAP = [
  { level: 0, key: 'NONE', name: '없음', bell: 0, icon: null },
  { level: 1, key: 'LAND', name: '땅', bell: 300, icon: `${BASE.board}/land.webp` },
  { level: 2, key: 'TENT', name: '텐트', bell: 500, cloth: 1, iron: 1, icon: `${BASE.board}/tent.webp` },
  { level: 3, key: 'HOUSE_1', name: '작은집', bell: 1000, iron: 2, clay: 2, wood: 2, icon: `${BASE.board}/house_1.webp` },
  { level: 4, key: 'HOUSE_2', name: '큰집', bell: 1800, iron: 3, clay: 3, wood: 3, brick: 3, icon: `${BASE.board}/house_2.webp` },
  { level: 5, key: 'MYHOME', name: '마이홈', bell: 3000, iron: 5, clay: 5, brick: 5, cloth: 5, wallpaper: 5, flooring: 5, icon: null },
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

/* RewardGetScreen 전용: 보상 키를 house requirement key로 변환 */
const toHouseReqKey = (resourceKey) => {
  const s = String(resourceKey ?? '').trim();
  return s ? s.toLowerCase() : null;
};

const isResourceNeededForLevel = (levelObj, resourceKey) => {
  const reqKey = toHouseReqKey(resourceKey);
  if (!levelObj || !reqKey) return false;

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
  const key = normalizeHouseKey(levelOrKey);
  if (!key) return null;

  if (key === 'MYHOME') return getHouseImageFromCharacter(characterId);
  return HOUSE_DETAILS[key]?.icon ?? null;
};

const getJongIndex = (word) => {
  const s = String(word ?? '').trim();
  if (!s) return -1;

  const last = s[s.length - 1];
  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return -1;

  return (code - 0xac00) % 28;
};

/* 텐트로 / 집으로 / 마을로(ㄹ 받침 예외) */
export const roEuro = (word) => {
  const jong = getJongIndex(word);
  if (jong <= 0) return '로';
  if (jong === 8) return '로';
  return '으로';
};
