// constants/boardData.js
// 24개 타일의 이름과 타입 정의
// 각 타일의 좌표(x, y) 계산
// TODO: 반드시 서버 데이터(BoardData.java)와 일치해야 함

const rawTiles = [
  { id: 0, type: 'START', name: '시작' },
  { id: 1, type: 'RESOURCE', name: '재화칸' },
  { id: 2, type: 'HARVEST', name: '과일칸' },
  { id: 3, type: 'SHOP_RESOURCE', name: '재화상점' },
  { id: 4, type: 'STAMP_GAPDOL', name: '갑돌섬' },
  { id: 5, type: 'RESOURCE', name: '재화칸' },
  { id: 6, type: 'LOAN', name: '대출칸' },
  { id: 7, type: 'HARVEST', name: '과일칸' },
  { id: 8, type: 'ITEM', name: '아이템칸' },
  { id: 9, type: 'STAMP_MUSEUM', name: '박물관' },
  { id: 10, type: 'RESOURCE', name: '재화칸' },
  { id: 11, type: 'FISHING', name: '낚시칸' },
  { id: 12, type: 'KK', name: 'KK 공연장' },
  { id: 13, type: 'HARVEST', name: '과일칸' },
  { id: 14, type: 'STAMP_AIRPORT', name: '비행장' },
  { id: 15, type: 'MACHURILLA', name: '마추릴라' },
  { id: 16, type: 'RESOURCE', name: '재화칸' },
  { id: 17, type: 'HARVEST', name: '과일칸' },
  { id: 18, type: 'SWAP', name: '몽셰르' },
  { id: 19, type: 'RESOURCE', name: '재화칸' },
  { id: 20, type: 'ITEM', name: '아이템칸' },
  { id: 21, type: 'MUPANI', name: '무 주식' },
  { id: 22, type: 'HARVEST', name: '과일칸' },
  { id: 23, type: 'FISHING', name: '낚시칸' },
];

const TILE_SIZE = 100;
const GRID_SIZE = 7; // 가로 7칸, 세로 7칸 정사각형
const MAX_COORD = (GRID_SIZE - 1) * TILE_SIZE; // 600px

const generatePositions = (tiles) => {
  return tiles.map((tile) => {
    const id = tile.id;
    let x, y;

    if (id >= 0 && id <= 6) {
      // 하단: 0~6 (왼쪽 -> 오른쪽)
      x = id * TILE_SIZE;
      y = MAX_COORD;
    } else if (id >= 7 && id <= 12) {
      // 우측: 7~12 (아래 -> 위)
      x = MAX_COORD;
      y = MAX_COORD - (id - 6) * TILE_SIZE;
    } else if (id >= 13 && id <= 18) {
      // 상단: 13~18 (오른쪽 -> 왼쪽)
      x = MAX_COORD - (id - 12) * TILE_SIZE;
      y = 0;
    } else {
      // 좌측: 19~23 (위 -> 아래)
      x = 0;
      y = (id - 18) * TILE_SIZE;
    }

    return { ...tile, x, y };
  });
};

export const boardTiles = generatePositions(rawTiles);
