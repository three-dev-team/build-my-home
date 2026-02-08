const isHangulSyllable = (ch) => {
  if (!ch) return false;
  const code = ch.charCodeAt(0);
  return code >= 0xac00 && code <= 0xd7a3;
};

const getLastChar = (word) => {
  const s = String(word ?? '').trim();
  return s ? s[s.length - 1] : '';
};

const getJongIndexHangul = (ch) => {
  if (!isHangulSyllable(ch)) return -1;
  return (ch.charCodeAt(0) - 0xac00) % 28; // 0이면 받침 없음
};

const DIGIT_HAS_JONG = {
  0: true,
  1: true,
  2: false,
  3: true,
  4: false,
  5: false,
  6: true,
  7: true,
  8: true,
  9: false,
};

const ALPHA_HAS_JONG = {
  A: false,
  B: false,
  C: false,
  D: false,
  E: false,
  F: true,
  G: false,
  H: false,
  I: false,
  J: false,
  K: false,
  L: true,
  M: true,
  N: true,
  O: false,
  P: false,
  Q: false,
  R: true,
  S: true,
  T: false,
  U: false,
  V: false,
  W: false,
  X: true,
  Y: false,
  Z: false,
};

const isDigit = (ch) => ch >= '0' && ch <= '9';
const isAlpha = (ch) => (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z');

const getJongIndex = (word) => {
  const last = getLastChar(word);
  if (!last) return -1;

  // 1) 한글 음절
  if (isHangulSyllable(last)) return getJongIndexHangul(last);

  // 2) 숫자
  if (isDigit(last)) return DIGIT_HAS_JONG[Number(last)] ? 1 : 0;

  // 3) 영문
  if (isAlpha(last)) {
    const key = last.toUpperCase();
    return ALPHA_HAS_JONG[key] ? 1 : 0;
  }

  // 4) 기타(기호/이모지 등) → 받침 없음 취급
  return -1;
};

const hasJong = (word) => {
  const jong = getJongIndex(word);
  if (jong < 0) return false;
  return jong > 0;
};

/* 기본 5종 */
export const iGa = (word) => (hasJong(word) ? '이' : '가');
export const eulReul = (word) => (hasJong(word) ? '을' : '를');
export const eunNeun = (word) => (hasJong(word) ? '은' : '는');
export const waGwa = (word) => (hasJong(word) ? '과' : '와');

/* 으로/로 (ㄹ 받침 예외) */
export const roEuro = (word) => {
  const last = getLastChar(word);
  if (!last) return '로';
  
  if (isHangulSyllable(last)) {
    const jong = getJongIndexHangul(last);
    if (jong <= 0) return '로';
    if (jong === 8) return '로'; // ㄹ 받침
    return '으로';
  }
  if (isDigit(last)) {
    const d = Number(last);
    if (d === 1 || d === 7 || d === 8) return '로';
    return DIGIT_HAS_JONG[d] ? '으로' : '로';
  }

  if (isAlpha(last)) {
    const up = last.toUpperCase();
    if (up === 'L' || up === 'R') return '로';
    return ALPHA_HAS_JONG[up] ? '으로' : '로';
  }
  return '로';
};
