const BASE = '/images/shop';

export const SHOP_ITEMS = [
  {
    key: 'FISHING_CHANCE',
    name: '낚시 떡밥',
    price: 300,
    imageSrc: `${BASE}/item-fishing.webp`,
  },
  {
    key: 'TARANTULA',
    name: '타란튤라',
    price: 200,
    imageSrc: `${BASE}/item-tarantula.webp`,
  },
  {
    key: 'WATERING',
    name: '물뿌리개',
    price: 50,
    imageSrc: `${BASE}/item-watering.webp`,
  },
  {
    key: 'KK_TICKET',
    name: 'KK 관람 티켓',
    price: 50,
    imageSrc: `${BASE}/item-kk-ticket.webp`,
  },
];

// key로 이미지 경로 가져오기
const IMAGE_MAP = SHOP_ITEMS.reduce((acc, cur) => {
  acc[cur.key] = cur.imageSrc;
  return acc;
}, {});

export const shopItemImageSrc = (key) => IMAGE_MAP[key] || `${BASE}/${key}.webp`;
