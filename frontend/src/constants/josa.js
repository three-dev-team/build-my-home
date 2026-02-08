const isHangulSyllable = (ch) => {
  if (!ch) return false;
  const code = ch.charCodeAt(0);
  return code >= 0xac00 && code <= 0xd7a3;
};

const getLastChar = (word) => {
  const s = String(word ?? '').trim();
  return s ? s[s.length - 1] : '';
};

const getJongIndex = (word) => {
  const last = getLastChar(word);
  if (!isHangulSyllable(last)) return -1;
  return (last.charCodeAt(0) - 0xac00) % 28; // 0이면 받침 없음
};

const hasJong = (word) => getJongIndex(word) > 0;

/* 기본 5종 */
export const iGa = (word) => (hasJong(word) ? '이' : '가');
export const eulReul = (word) => (hasJong(word) ? '을' : '를');
export const eunNeun = (word) => (hasJong(word) ? '은' : '는');
export const waGwa = (word) => (hasJong(word) ? '과' : '와');

/* 으로/로 (ㄹ 받침 예외) */
export const roEuro = (word) => {
  const jong = getJongIndex(word);
  if (jong <= 0) return '로'; // 받침 없음
  if (jong === 8) return '로'; // ㄹ 받침(종성 인덱스 8)
  return '으로';
};
