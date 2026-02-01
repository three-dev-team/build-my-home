const BASE = {
  item: '/images/item',
};

// 아이템 메타를 한 곳에서 생성(서버 키/파일 키/이미지 경로까지 통일)
function makeItem({ id, serverKey, assetKey, name, desc = '' }) {
  return {
    id,
    key: serverKey, // 대표 키: 서버 enum name() 기준
    serverKey,      // 백엔드에서 내려오는 enum 문자열(예: "CUSTOM_DICE")
    assetKey,       // 파일명용 snake_case(예: "custom_dice")
    name,
    desc,
    image: `${BASE.item}/item-${assetKey}.webp`,
  };
}

// 전체 아이템 목록(표시/드랍/인벤토리 공통으로 사용)
export const ITEMS = [
  makeItem({ id: 1,  serverKey: 'CUSTOM_DICE',    assetKey: 'custom_dice',    name: '내맘대로주사위' }),
  makeItem({ id: 2,  serverKey: 'DORUMUK',        assetKey: 'dorumuk',        name: '도루묵전화기' }),
  makeItem({ id: 3,  serverKey: 'DOUBLE_DICE',    assetKey: 'double_dice',    name: '더블주사위' }),
  makeItem({ id: 4,  serverKey: 'FISHING_CHANCE', assetKey: 'fishing_chance', name: '떡밥' }),
  makeItem({ id: 5,  serverKey: 'GOLD_DICE',      assetKey: 'gold_dice',      name: '금주사위' }),
  makeItem({ id: 6,  serverKey: 'KK_TICKET',      assetKey: 'kk_ticket',      name: 'K.K. 티켓' }),
  makeItem({ id: 7,  serverKey: 'MIRROR',         assetKey: 'mirror',         name: '거울' }),
  makeItem({ id: 8,  serverKey: 'PIPE',           assetKey: 'pipe',           name: '파이프' }),
  makeItem({ id: 9,  serverKey: 'TARANTULA',      assetKey: 'tarantula',      name: '타란튤라' }),
  makeItem({ id: 10, serverKey: 'WATERING',       assetKey: 'watering',       name: '물뿌리개' }),
];

// 서버가 enum("CUSTOM_DICE")을 보내든, 파일키("custom_dice")를 보내든 동일 아이템으로 조회
export const ITEM_INFO_BY_KEY = Object.fromEntries(
  ITEMS.flatMap((it) => [
    [it.serverKey, it],
    [it.assetKey, it],
  ])
);
