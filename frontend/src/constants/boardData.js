export const TILE_TYPES = {
    START: 'START',
    STAMP_BLUE: 'STAMP_BLUE',
    STAMP_YELLOW: 'STAMP_YELLOW',
    STAMP_RED: 'STAMP_RED',
    STAMP_GREEN: 'STAMP_GREEN',
    SHOP_RESOURCE: 'SHOP_RESOURCE',
    SHOP_ITEM: 'SHOP_ITEM',
    RESOURCE: 'RESOURCE',
    FRUIT: 'FRUIT',
    LOAN: 'LOAN',
    FISHING: 'FISHING',
    KK: 'KK',
};

export const boardTiles = [
    // 0-5: 첫 번째 변
    { id: 0, type: 'START', name: '시작' },
    { id: 1, type: 'RESOURCE', name: '재화칸' },
    { id: 2, type: 'FRUIT', name: '과일칸' },
    { id: 3, type: 'SHOP_RESOURCE', name: '재화상점' },
    { id: 4, type: 'STAMP_BLUE', name: '파란 스탬프' },
    { id: 5, type: 'RESOURCE', name: '재화칸' },

    // 6-11: 두 번째 변
    { id: 6, type: 'LOAN', name: '대출칸' },
    { id: 7, type: 'FRUIT', name: '과일칸' },
    { id: 8, type: 'SHOP_ITEM', name: '아이템상점' },
    { id: 9, type: 'STAMP_YELLOW', name: '노란 스탬프' },
    { id: 10, type: 'RESOURCE', name: '재화칸' },
    { id: 11, type: 'FISHING', name: '낚시칸' },

    // 12-17: 세 번째 변
    { id: 12, type: 'KK', name: 'KK 공연장' },
    { id: 13, type: 'FRUIT', name: '과일칸' },
    { id: 14, type: 'STAMP_RED', name: '빨간 스탬프' },
    { id: 15, type: 'SHOP_RESOURCE', name: '재화상점' },
    { id: 16, type: 'RESOURCE', name: '재화칸' },
    { id: 17, type: 'FRUIT', name: '과일칸' },

    // 18-23: 네 번째 변
    { id: 18, type: 'LOAN', name: '대출칸' },
    { id: 19, type: 'RESOURCE', name: '재화칸' },
    { id: 20, type: 'SHOP_ITEM', name: '아이템상점' },
    { id: 21, type: 'STAMP_GREEN', name: '초록 스탬프' },
    { id: 22, type: 'FRUIT', name: '과일칸' },
    { id: 23, type: 'FISHING', name: '낚시칸' },
];