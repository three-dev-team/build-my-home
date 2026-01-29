export const MIN_LOAN_AMOUNT = 50;
export const MAX_LOAN_AMOUNT = 500; // 500 벨

// TODO: 서버 데이터와 동기화 필요
export const ITEM_INFO = {
  PIPE: {
    emoji: '🚇',
    name: '토관',
    description: '위치가 랜덤으로 이동된다.',
  },
  CUSTOM_DICE: {
    emoji: '🎯',
    name: '내 맘대로 주사위',
    description: '원하는 숫자만큼 이동할 수 있다.',
  },
  DOUBLE_DICE: {
    emoji: '🎲',
    name: '더블 주사위',
    description: '주사위를 2번 돌릴 수 있다.',
  },
  GOLD_DICE: {
    emoji: '💰',
    name: '금주사위',
    description: '주사위를 굴려 나온 숫자 x 100벨을 획득한다.',
  },
  MIRROR: {
    emoji: '🪞',
    name: '거울',
    description: '랜덤으로 특정 플레이어와 위치를 교환한다.',
  },
};
