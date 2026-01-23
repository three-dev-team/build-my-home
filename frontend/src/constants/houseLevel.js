// constants/houseLevel.js
// TODO: 반드시 서버 데이터(HouseLevel.java)와 일치해야 함

// step1에서 정보 뿌려줄 때 사용
export const HOUSE_LEVEL_MAP = [
  { level: 0, key: 'NONE', name: '없음', bell: 0 },
  { level: 1, key: 'LAND', name: '땅', bell: 300 },
  { level: 2, key: 'TENT', name: '텐트', bell: 400, cloth: 1, iron: 1 },
  { level: 3, key: 'HOUSE_1', name: '집(1)', bell: 1000, iron: 1, clay: 1 },
  { level: 4, key: 'HOUSE_2', name: '집(2)', bell: 1800, iron: 3, clay: 3, wood: 3, brick: 3 },
  { level: 5, key: 'HOUSE_3', name: '집(3)', bell: 3000, iron: 5, clay: 5, brick: 5, wallpaper: 5, flooring: 5 },
];

// step2,3에서 키값으로 정보 찾을 때 사용
export const HOUSE_DETAILS = HOUSE_LEVEL_MAP.reduce((acc, curr) => {
  acc[curr.key] = curr;
  return acc;
}, {});

export const RESOURCE_MAP = {
  WOOD: { icon: '🪵', name: '목재' },
  IRON: { icon: '⛏️', name: '철광석' },
  CLOTH: { icon: '🧵', name: '천' },
  BRICK: { icon: '🧱', name: '벽돌' },
  WALLPAPER: { icon: '🎨', name: '벽지' },
  CLAY: { icon: '🪨', name: '점토' },
  FLOORING: { icon: '🪵', name: '바닥' },
};
