/**
 * 디자인 가이드라인(design_rules.md)에 정의된 색상 상수입니다.
 */

export const COLORS = {
  // 4. 색상 팔레트
  primary: '#E76C21', // 메인 오렌지
  secondary: '#6b8e5e', // 녹색 배경
  background: '#F0F2EB', // 연한 베이지
  text: '#594E36', // 다크 브라운
  border: '#C5D0C6', // 연한 테두리
  inventory: '#EDDECA',

  // 동물의 숲 확장팩 (환경 및 UI)
  ac: {
    // [기본 팔레트] 이미지 기반 통합 팔레트
    red: '#EB5757',
    creamWhite: '#FDFBF6',
    creamIvory: '#FFFEE0',
    softYellow: '#F9F0A3',
    yellow: '#F2C94C',
    lightGreen: '#B4E4B5',
    lilac: '#D9C5F8',
    purpleGray: '#F9F3F9', // 이미지: 퍼플 그레이
    lightPurple: '#F0E0F8', // 이미지 스펙 원본값
    lightBrown: '#fde9be', // 라이트 브라운
    brown: '#d5b78d', // 브라운
    darkBrown: '#594E36',
    coffeeBrown: '#7B6C53',
    nookCyan: '#34C4D3',
    nookMint: '#78D7B2',
    green: '#57B47C',
    readyGreen: '#57B47C', // 준비완료 버튼 - green과 동일
    darkPurple: '#744990',
    purple: '#9165AA',
    white: '#FFFFFF',
    black: '#000000',

    // [기존 및 레거시 별칭]
    mint: '#78D7B2', // nookMint의 별칭
    cream: '#FDFBF6', // creamWhite의 별칭
    bell: '#EAC02E',
    dialogBlue: '#2D9CDB',
    grass: '#75CE67',
    ocean: '#3DAAD6',
    sand: '#E6D6AA',
    wood: '#966F33',
    woodDeep: '#896339',
    woodDark: '#4E3B24',
  },

  subtitle: {
    contentBox: '#fffae4',
    contentText: '#5b4d33',
    arrow: '#ffb700',
    optionBox: '#fcec9e',
    optionText: '#5b4d33',
  },

  dialogbox: {
    contentBox: '#183653',
    contentText: '#5b4d33',
    arrow: '#ffb700',
    optionBox: '#fcec9e',
    optionText: '#5b4d33',
  },

  // 계산기
  numberPad: {
    panel: '#a6916b',
    key: '#e5c691',
    keyText: '#846240',
    clear: '#eebb4e',
    max: '#b9944c',
    backspace: '#60605a',
    confirm: '#00b6a9',
    creamWhite: '#FDFBF6',
  },

  // 캐릭터별 자막 색상
  characters: {
    // 여울 (시청 사무소)
    yeoul: {
      nameBox: '#fcfe8f', // 파란색
      nameText: '#dfaa19',
    },
    // 너굴 (상점)
    naugul: {
      nameBox: '#e38a40', // 민트
      nameText: '#50100e',
    },
    // 마추릴라
    machurilla: {
      nameBox: '#2f467e',
      nameText: '#f5f5ee',
      contentBox: '#471c52',
      contentText: '#f4eafe',
      boomBox: '#70160c',
      boomText: '#eabd40',
    },
    // KK
    kk: {
      nameBox: '#F2C94C', // 노랑
      nameText: '#5b4d33',
    },
    // 갑돌이 (갑돌섬)
    gapdol: {
      nameBox: '#5baa32',
      nameText: '#F2C94C',
    },
    // 부엉이 (박물관)
    bueong: {
      nameBox: '#725639',
      nameText: '#FFFEE0',
    },
    // 모리 (비행장)
    mori: {
      nameBox: '#F2C94C',
      nameText: '#2D9CDB',
    },
    // 무파니
    mupani: {
      nameBox: '#E79F52',
      nameText: '#923421',
    },
    // 몽셰르(스왑)
    mongsher: {
      nameBox: '#ba3aa7',
      nameText: '#fdcbfd',
    },
    // 도루묵씨(404, 아이템)
    dorumook: {
      nameBox: '#ec7c3c',
      nameText: '#6b1a03',
    },
    // 기본값
    default: {
      nameBox: '#9B59B6',
      nameText: '#FFFFFF',
    },
  },

  // RoomList 페이지 전용 (라벤더 테마)
  roomList: {
    textMain: '#6A4F9C',
    textSub: '#5A4A6F',
    textHighlight: '#D68FD6',
    bgMain: '#EAD8F9',
    bgMainTransparent: 'rgba(234, 216, 249, 0.95)', // #EAD8F9 + 불투명도 95%
    btnMain: '#9B7AD6',
    btnHover: '#8A6AC6',
    btnDisabled: '#D1C4E9',
    border: '#B39DDB',
    iconBase: '#D6BCFA',
    lock: '#8A7A9F',
  },

  // 1:1 문의 페이지 전용 팔레트
  userInquiry: {
    red: '#EB5757',
    creamPink: '#f5e8dd',
    creamWhite: '#FDFBF6',
    creamIvory: '#FFFEE0',
    softYellow: '#F9F0A3',
    yellow: '#F2C94C',
    lightGreen: '#B4E4B5',
    lilac: '#D9C5F8',
    purpleGray: '#F9F3F9',
    lightPurple: '#F0E0F8',
    darkBrown: '#594E36',
    coffeeBrown: '#7B6C53',
    nookCyan: '#34C4D3',
    nookMint: '#78D7B2',
    green: '#57B47C',
    darkPurple: '#744990',
    purple: '#9165AA',
  },

  // 관리자 페이지 전용 팔레트
  admin: {
    red: '#EB5757',
    creamWhite: '#FDFBF6',
    creamIvory: '#FFFEE0',
    softYellow: '#F9F0A3',
    yellow: '#F2C94C',
    lightGreen: '#B4E4B5',
    lilac: '#D9C5F8',
    purpleGray: '#F9F3F9',
    lightPurple: '#F0E0F8',
    darkBrown: '#594E36',
    coffeeBrown: '#7B6C53',
    nookCyan: '#34C4D3',
    nookMint: '#78D7B2',
    green: '#57B47C',
    darkPurple: '#744990',
    purple: '#9165AA',
  },

  house: {
    panelBrown: '#301e08',
    cardBrown: '#1f1203',
  },
};

// 예: 검정 35% -> withAlpha(COLORS.ac.black, 0.35)
export const hexToRgba = (hex, alpha = 1, fallback = `rgba(0,0,0,${alpha})`) => {
  if (hex == null) return fallback;
  let h = String(hex).trim();
  if (!h) return fallback;

  const lower = h.toLowerCase();
  if (lower.startsWith('rgba(') || lower.startsWith('rgb(') || lower.startsWith('hsla(') || lower.startsWith('hsl(')) {
    return h;
  }

  if (h.startsWith('#')) h = h.slice(1);
  if (h.length === 3)
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  if (h.length !== 6) return fallback;

  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const a = Math.max(0, Math.min(1, Number(alpha)));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};
export const withAlpha = (hex, alpha) => hexToRgba(hex, alpha);
