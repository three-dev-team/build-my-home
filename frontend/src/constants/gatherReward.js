const BASE = {
  reward: '/images/reward',
};

// 보상(리소스/과일) 메타 생성: key(서버 enum) + 표시명 + 이미지 src
function makeItem({ key, name, file }) {
  return {
    key,
    name,
    src: `${BASE.reward}/${file}.webp`,
  };
}

// 리소스 정의(표시 순서 유지: UI/드랍 순서 기준으로 사용)
export const RESOURCES = [
  makeItem({ key: 'WOOD', name: '목재', file: 'resource-wood' }),
  makeItem({ key: 'IRON', name: '철광석', file: 'resource-iron' }),
  makeItem({ key: 'CLOTH', name: '천', file: 'resource-cloth' }),
  makeItem({ key: 'BRICK', name: '벽돌', file: 'resource-brick' }),
  makeItem({ key: 'WALLPAPER', name: '벽지', file: 'resource-wallpaper' }),
  makeItem({ key: 'CLAY', name: '점토', file: 'resource-clay' }),
  makeItem({ key: 'FLOORING', name: '바닥재', file: 'resource-floor' }),
  makeItem({ key: 'STONE', name: '돌', file: 'resource-stone' }),
];

// 과일(수확물) 정의(표시 순서 유지)
export const FRUITS = [
  makeItem({ key: 'APPLE', name: '사과', file: 'harvest-apple' }),
  makeItem({ key: 'CHERRY', name: '체리', file: 'harvest-cherry' }),
  makeItem({ key: 'ORANGE', name: '오렌지', file: 'harvest-orange' }),
  makeItem({ key: 'PEACH', name: '복숭아', file: 'harvest-peach' }),
  makeItem({ key: 'PEAR', name: '배', file: 'harvest-pear' }),
];

// RewardDrop에서 사용하는 드랍/표시 순서(서버 key 기준)
export const RESOURCE_ORDER = ['STONE', 'WOOD', 'IRON', 'CLOTH', 'BRICK', 'WALLPAPER', 'CLAY', 'FLOORING'];
export const FRUIT_ORDER = ['APPLE', 'ORANGE', 'PEAR', 'PEACH', 'CHERRY'];

// key -> 한글 이름 매핑
const NAME_MAP = [...RESOURCES, ...FRUITS].reduce((acc, cur) => {
  acc[cur.key] = cur.name;
  return acc;
}, {});

// key -> 이미지 src 매핑
const SRC_MAP = [...RESOURCES, ...FRUITS].reduce((acc, cur) => {
  acc[cur.key] = cur.src;
  return acc;
}, {});

// key를 한글 이름으로 변환(없으면 key 그대로)
export const koName = (key) => NAME_MAP[key] || key;

// key에 대응하는 이미지 src 반환(없으면 기본 경로로 fallback)
export const rewardImageSrc = (key) => SRC_MAP[key] || `${BASE.reward}/${key}.webp`;

// gainedResources/gainedHarvests 같은 {KEY: number}에서 수량 안전 조회
export const getCount = (obj, key) => {
  if (!obj) return 0;
  const v = obj[key];
  return typeof v === 'number' ? v : 0;
};

// 단어의 종성 유무 판정(조사 처리용)
const hasJong = (word) => {
  if (!word) return false;
  const last = word[word.length - 1];
  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
};

// 조사(와/과)
export const waGwa = (word) => (hasJong(word) ? '과' : '와');

// 조사(을/를)
export const eulReul = (word) => (hasJong(word) ? '을' : '를');

// 조사(이/가)
export const iGa = (word) => (hasJong(word) ? '이' : '가');
