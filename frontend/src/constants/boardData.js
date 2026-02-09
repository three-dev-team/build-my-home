const BASE_W = 1920;
const BASE_H = 1080;

// 1920x1080 기준 보드 이미지 위 픽셀 좌표(타일 좌상단/가로/세로)
const rawTiles = [
  { id: 0, type: 'START', name: '시작', x: 507, y: 725, w: 96, h: 85 },
  { id: 1, type: 'FISHING', name: '낚시칸', x: 605, y: 725, w: 109, h: 85 },
  { id: 2, type: 'MUPANI', name: '무 주식', x: 711, y: 725, w: 106, h: 85 },
  { id: 3, type: 'HARVEST', name: '과일칸', x: 825, y: 725, w: 101, h: 85 },
  { id: 4, type: 'ITEM', name: '아이템칸', x: 934, y: 725, w: 99, h: 85 },
  { id: 5, type: 'RESOURCE', name: '재화칸', x: 1040, y: 725, w: 102, h: 85 },
  { id: 6, type: 'HARVEST', name: '과일칸', x: 1148, y: 725, w: 107, h: 85 },
  { id: 7, type: 'STAMP_AIRPORT', name: '비행장', x: 1255, y: 725, w: 96, h: 85 },
  { id: 8, type: 'SHOP', name: '상점', x: 1244, y: 642, w: 105, h: 79 },
  { id: 9, type: 'MACHURILLA', name: '마추릴라', x: 1234, y: 562, w: 101, h: 73 },
  { id: 10, type: 'LOAN', name: '대출칸', x: 1224, y: 490, w: 97, h: 68 },
  { id: 11, type: 'HARVEST', name: '과일칸', x: 1215, y: 422, w: 93, h: 63 },
  { id: 12, type: 'FISHING', name: '낚시칸', x: 1206, y: 358, w: 90, h: 60 },
  { id: 13, type: 'RESOURCE', name: '재화칸', x: 1202, y: 300, w: 83, h: 56 },
  { id: 14, type: 'KK', name: 'KK 공연장', x: 1185, y: 245, w: 83, h: 53 },
  { id: 15, type: 'HARVEST', name: '과일칸', x: 1110, y: 245, w: 80, h: 53 },
  { id: 16, type: 'STAMP_MUSEUM', name: '박물관', x: 1024, y: 245, w: 78, h: 53 },
  { id: 17, type: 'ITEM', name: '아이템칸', x: 940, y: 245, w: 77, h: 53 },
  { id: 18, type: 'HARVEST', name: '과일칸', x: 854, y: 245, w: 78, h: 53 },
  { id: 19, type: 'LOAN', name: '대출칸', x: 768, y: 245, w: 81, h: 53 },
  { id: 20, type: 'RESOURCE', name: '재화칸', x: 682, y: 245, w: 83, h: 53 },
  { id: 21, type: 'SHOP', name: '상점', x: 602, y: 245, w: 85, h: 53 },
  { id: 22, type: 'SWAP', name: '몽셰르', x: 585, y: 300, w: 88, h: 56 },
  { id: 23, type: 'SWAP', name: '몽셰르', x: 572, y: 358, w: 91, h: 60 },
  { id: 24, type: 'STAMP_GAPDOL', name: '갑돌섬', x: 560, y: 422, w: 94, h: 53 },
  { id: 25, type: 'HARVEST', name: '과일칸', x: 543, y: 490, w: 99, h: 68 },
  { id: 26, type: 'FISHING', name: '낚시칸', x: 527, y: 562, w: 102, h: 73 },
  { id: 27, type: 'RESOURCE', name: '재화칸', x: 509, y: 642, w: 108, h: 79 },
];

const toNum = (v, fb = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
};

const clamp01 = (v) => Math.max(0, Math.min(1, v));

const toTile = (t) => {
  const x = toNum(t.x);
  const y = toNum(t.y);
  const w = toNum(t.w);
  const h = toNum(t.h);

  const centerX = x + w / 2;
  const centerY = y + h / 2;

  // r* 값들은 1920x1080 대비 비율(0~1)
  // -> 보드 컨테이너 실제 크기에 곱해서 쓰면 리사이즈에도 위치 유지
  const rx = clamp01(x / BASE_W);
  const ry = clamp01(y / BASE_H);
  const rw = clamp01(w / BASE_W);
  const rh = clamp01(h / BASE_H);
  const rCenterX = clamp01(centerX / BASE_W);
  const rCenterY = clamp01(centerY / BASE_H);

  return {
    ...t,
    x,
    y,
    w,
    h,
    centerX,
    centerY,
    rx,
    ry,
    rw,
    rh,
    rCenterX,
    rCenterY,
  };
};

// boardTiles는 rawTiles에 계산 필드(center/r*)를 붙인 최종 타일 메타 배열이다
export const boardTiles = rawTiles.map(toTile);

export const getTileById = (id) => {
  const n = Number(id);
  if (!Number.isFinite(n)) return null;
  // id가 같은 타일을 찾아 반환하고 없으면 null을 준다
  return boardTiles.find((t) => Number(t.id) === n) || null;
};

export const getPawnOffset = (tile, slotIndex, countOnTile = 1) => {
  const count = Number(countOnTile);
  // 혼자 있으면 중앙 고정이라 오프셋이 필요X
  if (!Number.isFinite(count) || count <= 1) return { dx: 0, dy: 0 };

  const w = Number(tile?.w) || 0;
  const h = Number(tile?.h) || 0;

  // 타일 크기에 비례해서 퍼지도록
  const spread = Math.max(8, Math.min(w, h) * 0.35);

  // 2명: 좌/우만 벌리고 세로 중앙(dy=0)
  if (count === 2) {
    const lr = spread * 0.75;
    const map2 = [
      { dx: -lr, dy: 0 }, // 왼
      { dx: +lr, dy: 0 }, // 오
    ];
    return map2[slotIndex] || { dx: 0, dy: 0 };
  }

  // 3명: 삼각형(위1 + 아래2)
  if (count === 3) {
    const lr = spread * 0.75; // 아래 좌/우 간격
    const ud = spread * 0.75; // 위/아래 간격
    const map3 = [
      { dx: 0, dy: +ud }, // 0: 앞(중앙)
      { dx: -lr, dy: -ud }, // 1: 뒤-왼
      { dx: +lr, dy: -ud }, // 2: 뒤-오
    ];
    return map3[slotIndex] || { dx: 0, dy: 0 };
  }

  // 4명: 2x2
  const map4 = [
    { dx: -spread, dy: -spread }, // 0: 좌상
    { dx: +spread, dy: -spread }, // 1: 우상
    { dx: -spread, dy: +spread }, // 2: 좌하
    { dx: +spread, dy: +spread }, // 3: 우하
  ];

  return map4[slotIndex] || { dx: 0, dy: 0 };
};
