const BASE = {
  item: '/images/item',
};

// 문자열 키 정규화(따옴표 감싸진 경우 제거 + trim)
export function normalizeItemKey(raw) {
  if (raw === null || raw === undefined) return null;

  // 숫자는 string으로만(매핑은 resolveItemKey에서 처리)
  if (typeof raw === 'number') return String(raw);

  const s = String(raw).trim();
  if (!s) return null;

  // "CUSTOM_DICE" 같은 형태 방어
  const unquoted = s.replace(/^"+|"+$/g, '').trim();
  return unquoted || null;
}

// 아이템 메타를 한 곳에서 생성(서버 키/파일 키/이미지 경로까지 통일)
function makeItem({ id, serverKey, assetKey, name, desc = '' }) {
  return {
    id,
    key: serverKey, // 대표 키: 서버 enum name() 기준
    serverKey, // 백엔드에서 내려오는 enum 문자열(예: "CUSTOM_DICE")
    assetKey, // 파일명용 snake_case(예: "custom_dice")
    name,
    desc,
    image: `${BASE.item}/item-${assetKey}.webp`,
  };
}

// 전체 아이템 목록(표시/드랍/인벤토리 공통으로 사용)
export const ITEMS = [
  makeItem({
    id: 1,
    serverKey: 'CUSTOM_DICE',
    assetKey: 'custom_dice',
    name: '내맘대로주사위',
    desc: '원하는 숫자를 골라서 딱 그만큼 이동할 수 있어요~',
  }),
  makeItem({
    id: 2,
    serverKey: 'DORUMUK',
    assetKey: 'dorumuk',
    name: '도루묵전화기',
    desc: '앗, 잘못 왔다! 이동 전 위치로 슝~ 돌아가요',
  }),
  makeItem({
    id: 3,
    serverKey: 'DOUBLE_DICE',
    assetKey: 'double_dice',
    name: '더블주사위',
    desc: '주사위를 두 번이나 굴릴 수 있어요! 두 배로 신나~',
  }),
  makeItem({
    id: 4,
    serverKey: 'GOLD_DICE',
    assetKey: 'gold_dice',
    name: '금주사위',
    desc: '반짝반짝~ 나온 숫자만큼 벨이 쏟아져요!',
  }),
  makeItem({
    id: 5,
    serverKey: 'MIRROR',
    assetKey: 'mirror',
    name: '거울',
    desc: '거울아 거울아~ 다른 주민과 자리를 바꿔줘!',
  }),
  makeItem({ id: 6, serverKey: 'PIPE', assetKey: 'pipe', name: '파이프', desc: '쏙! 원하는 칸으로 순간이동해요~' }),
];

export const ITEM_INFO_BY_KEY = Object.fromEntries(
  ITEMS.flatMap((it) => [
    [it.serverKey, it],
    [it.assetKey, it],
    [it.id, it],
    [String(it.id), it],
    [`item-${it.assetKey}`, it],
    [`item_${it.assetKey}`, it],
    [`item-${it.assetKey}.webp`, it],
    [`item_${it.assetKey}.webp`, it],
    [`${BASE.item}/item-${it.assetKey}.webp`, it],
  ]),
);

// 어떤 값이 와도 최대한 맞춰주는 헬퍼
export function resolveItemKey(raw) {
  if (raw === null || raw === undefined) return null;

  // 숫자면 id로
  if (typeof raw === 'number') return ITEM_INFO_BY_KEY[raw] || null;

  const s0 = normalizeItemKey(raw);
  if (!s0) return null;

  // 1) 그대로
  if (ITEM_INFO_BY_KEY[s0]) return ITEM_INFO_BY_KEY[s0];

  // 2) 대문자(ENUM) 시도
  const upper = s0.toUpperCase();
  if (ITEM_INFO_BY_KEY[upper]) return ITEM_INFO_BY_KEY[upper];

  // 3) 경로/확장자 제거해서 assetKey 뽑기
  const file = s0.split('/').pop() || s0;
  const noExt = file.replace(/\.(webp|png|jpg|jpeg)$/i, '');
  const noPrefix = noExt.replace(/^item[-_]/i, '');
  if (ITEM_INFO_BY_KEY[noPrefix]) return ITEM_INFO_BY_KEY[noPrefix];

  return null;
}
