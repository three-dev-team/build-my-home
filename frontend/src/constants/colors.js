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
    purpleGray: '#F9F3F9', // 이름 변경 (이미지: 퍼플 그레이)
    lightPurple: '#F0E0F8', // 값 변경 (이미지: 라이트 퍼플)
    darkBrown: '#594E36',
    coffeeBrown: '#7B6C53',
    nookCyan: '#34C4D3',
    nookMint: '#78D7B2',
    green: '#57B47C',
    darkPurple: '#744990',
    purple: '#9165AA',

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
};
