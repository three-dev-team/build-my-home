const BASE = {
  room: '/images/room',
  roomList: '/images/roomlist',
  character: '/images/character',
};

function makeCharacter({ id, name, quote, key, color, ext = {} }) {
  const { idle = 'webp', house = 'webp', roomList = 'webp' } = ext;
  return {
    id,
    name,
    quote,
    color,
    key,
    selectBasicImage: `${BASE.room}/char-${key}-idle.${idle}`,
    houseImage: `${BASE.room}/char-${key}-house.${house}`,
    roomListImage: `${BASE.roomList}/icon-${key}.${roomList}`,
    iconIdle: `${BASE.room}/icon-${key}-idle.webp`,
    iconActive: `${BASE.room}/icon-${key}-active.webp`,
    deliveryImage: `${BASE.character}/char-${key}-delivery.webp`,
    happyImage: `${BASE.character}/char-${key}-happy.webp`,
    sleepImage: `${BASE.character}/char-${key}-sleep.webp`,
    stampImage: `${BASE.character}/char-${key}-stamp.webp`,
  };
}

export const CHARACTERS = [
  makeCharacter({ id: 1, name: '애플', quote: '큐룽뀨뀨 나는 이 섬의 연예인', key: 'apple', color: '#EB5757' }),
  makeCharacter({ id: 2, name: '미첼', quote: '동글동글 귀여운 게 최고야', key: 'michel', color: '#34C4D3' }),
  makeCharacter({ id: 3, name: '메이플', quote: '독서는 마음의 양식이죠', key: 'maple', color: '#7B6C53' }),
  makeCharacter({ id: 4, name: '빙티', quote: '배고파... 샌드위치 먹고 싶어', key: 'bingti', color: '#594E36' }),
  makeCharacter({
    id: 5,
    name: '쭈니',
    quote: '훗, 나란 녀석은 어쩔 수 없군',
    key: 'zzuni',
    color: '#F9F3F9',
    ext: { house: 'png' },
  }),
  makeCharacter({
    id: 6,
    name: '시베리아',
    quote: '무슨 일이지? 바쁜데',
    key: 'cida',
    color: '#34C4D3',
    ext: { idle: 'webp', house: 'png' },
  }),
  makeCharacter({
    id: 7,
    name: '리처드',
    quote: '물놀이 하러 갈래?',
    key: 'richard',
    color: '#F2C94C',
    ext: { idle: 'webp', house: 'png' },
  }),
  makeCharacter({
    id: 8,
    name: '뽀야미',
    quote: '눈송이처럼 하얗고 싶어요',
    key: 'bboyami',
    color: '#FDFBF6',
    ext: { idle: 'webp', house: 'png' },
  }),
];
