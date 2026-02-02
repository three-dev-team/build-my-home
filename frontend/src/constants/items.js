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

// ✅ 서버가 enum("CUSTOM_DICE")을 보내든,
// ✅ 파일키("custom_dice")를 보내든,
// ✅ id(3) / "3"을 보내든,
// ✅ 파일명("item-double_dice.webp")을 보내든 동일 아이템으로 조회
export const ITEM_INFO_BY_KEY = Object.fromEntries(
  ITEMS.flatMap((it) => [
    // 기존
    [it.serverKey, it],
    [it.assetKey, it],

    // ✅ id도 매칭
    [it.id, it],
    [String(it.id), it],

    // ✅ 파일명/프리픽스 형태도 매칭
    [`item-${it.assetKey}`, it],
    [`item_${it.assetKey}`, it],
    [`item-${it.assetKey}.webp`, it],
    [`item_${it.assetKey}.webp`, it],
    [`${BASE.item}/item-${it.assetKey}.webp`, it],
  ])
);

// ✅ (선택) 어떤 값이 와도 최대한 맞춰주는 헬퍼
export function resolveItemKey(raw) {
  if (raw === null || raw === undefined) return null;

  // 숫자면 id로
  if (typeof raw === 'number') return ITEM_INFO_BY_KEY[raw] || null;

  const s = String(raw).trim();
  if (!s) return null;

  // 1) 그대로
  if (ITEM_INFO_BY_KEY[s]) return ITEM_INFO_BY_KEY[s];

  // 2) 대문자(ENUM) 시도
  const upper = s.toUpperCase();
  if (ITEM_INFO_BY_KEY[upper]) return ITEM_INFO_BY_KEY[upper];

  // 3) 경로/확장자 제거해서 assetKey 뽑기
  const file = s.split('/').pop() || s;
  const noExt = file.replace(/\.(webp|png|jpg|jpeg)$/i, '');
  const noPrefix = noExt.replace(/^item[-_]/i, '');
  if (ITEM_INFO_BY_KEY[noPrefix]) return ITEM_INFO_BY_KEY[noPrefix];

  return null;
}
