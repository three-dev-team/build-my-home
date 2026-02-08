const BASE = {
  reward: '/images/reward',
  inventory: '/images/inventory',
};

// 공통 메타 생성: 서버 enum KEY 그대로 연결
function makeItem({ key, name, rewardFile, iconFile, buyPrice, sellPrice, price }) {
  return {
    key,
    name,
    rewardSrc: `${BASE.reward}/${rewardFile}.webp`,
    iconSrc: `${BASE.inventory}/${iconFile}.webp`,
    buyPrice,
    sellPrice,
    price,
  };
}

export const RESOURCES = [
  makeItem({
    key: 'WOOD',
    name: '목재',
    rewardFile: 'resource-wood',
    iconFile: 'icon-wood',
    buyPrice: 120,
    sellPrice: 60,
  }),
  makeItem({
    key: 'IRON',
    name: '철광석',
    rewardFile: 'resource-iron',
    iconFile: 'icon-iron',
    buyPrice: 80,
    sellPrice: 40,
  }),
  makeItem({
    key: 'CLOTH',
    name: '천',
    rewardFile: 'resource-cloth',
    iconFile: 'icon-cloth',
    buyPrice: 60,
    sellPrice: 30,
  }),
  makeItem({
    key: 'BRICK',
    name: '벽돌',
    rewardFile: 'resource-brick',
    iconFile: 'icon-brick',
    buyPrice: 140,
    sellPrice: 70,
  }),
  makeItem({
    key: 'WALLPAPER',
    name: '벽지',
    rewardFile: 'resource-wallpaper',
    iconFile: 'icon-wallpaper',
    buyPrice: 200,
    sellPrice: 100,
  }),
  makeItem({
    key: 'CLAY',
    name: '점토',
    rewardFile: 'resource-clay',
    iconFile: 'icon-clay',
    buyPrice: 100,
    sellPrice: 50,
  }),
  makeItem({
    key: 'FLOORING',
    name: '바닥재',
    rewardFile: 'resource-floor',
    iconFile: 'icon-floor',
    buyPrice: 160,
    sellPrice: 80,
  }),
];

export const FRUITS = [
  makeItem({ key: 'APPLE', name: '사과', rewardFile: 'harvest-apple', iconFile: 'icon-apple', price: 80 }),
  makeItem({ key: 'ORANGE', name: '오렌지', rewardFile: 'harvest-orange', iconFile: 'icon-orange', price: 100 }),
  makeItem({ key: 'PEAR', name: '배', rewardFile: 'harvest-pear', iconFile: 'icon-pear', price: 120 }),
  makeItem({ key: 'PEACH', name: '복숭아', rewardFile: 'harvest-peach', iconFile: 'icon-peach', price: 150 }),
  makeItem({ key: 'CHERRY', name: '체리', rewardFile: 'harvest-cherry', iconFile: 'icon-cherry', price: 200 }),
];

// 서버 enum(HarvestType) 기준으로 물고기 KEY/이름/가격/이미지 전부 정합 맞춤
export const FISHES = [
  makeItem({
    key: 'FISH_SMALL_1',
    name: '흰동가리',
    rewardFile: 'harvest-fish-small-1',
    iconFile: 'icon-fish-small-1',
    price: 100,
  }),
  makeItem({
    key: 'FISH_SMALL_2',
    name: '송사리',
    rewardFile: 'harvest-fish-small-2',
    iconFile: 'icon-fish-small-2',
    price: 100,
  }),
  makeItem({
    key: 'FISH_MEDIUM_1',
    name: '농어',
    rewardFile: 'harvest-fish-medium-1',
    iconFile: 'icon-fish-medium-1',
    price: 200,
  }),
  makeItem({
    key: 'FISH_MEDIUM_2',
    name: '멸치',
    rewardFile: 'harvest-fish-medium-2',
    iconFile: 'icon-fish-medium-2',
    price: 200,
  }),
  makeItem({
    key: 'FISH_LARGE',
    name: '개복치',
    rewardFile: 'harvest-fish-large',
    iconFile: 'icon-fish-large',
    price: 500,
  }),
  makeItem({
    key: 'FISH_RARE',
    name: '상어',
    rewardFile: 'harvest-fish-rare',
    iconFile: 'icon-fish-rare',
    price: 1000,
  }),
];

// 표시/정렬 순서(서버 enum KEY 그대로)
export const RESOURCE_ORDER = ['WOOD', 'IRON', 'CLOTH', 'BRICK', 'WALLPAPER', 'CLAY', 'FLOORING'];
export const FRUIT_ORDER = ['APPLE', 'ORANGE', 'PEAR', 'PEACH', 'CHERRY'];
export const FISH_ORDER = [
  'FISH_SMALL_1',
  'FISH_SMALL_2',
  'FISH_MEDIUM_1',
  'FISH_MEDIUM_2',
  'FISH_LARGE',
  'FISH_RARE',
];

const ALL = [...RESOURCES, ...FRUITS, ...FISHES];

const NAME_MAP = ALL.reduce((acc, cur) => {
  acc[cur.key] = cur.name;
  return acc;
}, {});

const REWARD_SRC_MAP = ALL.reduce((acc, cur) => {
  if (cur.rewardSrc) acc[cur.key] = cur.rewardSrc;
  return acc;
}, {});

const ICON_SRC_MAP = ALL.reduce((acc, cur) => {
  acc[cur.key] = cur.iconSrc;
  return acc;
}, {});

const PRICE_MAP = ALL.reduce((acc, cur) => {
  if (typeof cur.price === 'number') acc[cur.key] = cur.price;
  return acc;
}, {});

const BUY_PRICE_MAP = ALL.reduce((acc, cur) => {
  if (typeof cur.buyPrice === 'number') acc[cur.key] = cur.buyPrice;
  return acc;
}, {});

const SELL_PRICE_MAP = ALL.reduce((acc, cur) => {
  if (typeof cur.sellPrice === 'number') acc[cur.key] = cur.sellPrice;
  return acc;
}, {});

// key를 한글 이름으로 변환(없으면 key 그대로)
export const koName = (key) => NAME_MAP[key] || key;
export const rewardImageSrc = (key) => REWARD_SRC_MAP[key] || `${BASE.reward}/${key}.webp`;
export const rewardIconSrc = (key) => ICON_SRC_MAP[key] || `${BASE.inventory}/${key}.webp`;
export const harvestPrice = (key) => (typeof PRICE_MAP[key] === 'number' ? PRICE_MAP[key] : 0);
export const resourceBuyPrice = (key) => (typeof BUY_PRICE_MAP[key] === 'number' ? BUY_PRICE_MAP[key] : 0);
export const resourceSellPrice = (key) => (typeof SELL_PRICE_MAP[key] === 'number' ? SELL_PRICE_MAP[key] : 0);

export const getCount = (obj, key) => {
  if (!obj) return 0;
  const v = obj[key];
  return typeof v === 'number' ? v : 0;
};
