import { useMemo } from 'react';
import { CHARACTERS } from '../../constants/characters.js';

const getCharacter = (characterId) => {
  const id = Number(characterId);
  return CHARACTERS.find((c) => Number(c.id) === id) || null;
};

/* 현재 차례 캐릭터 영역(박스 역할만)
   - 크기/위치는 부모(left-hud)가 관리
   - 이미지는 320x520 박스에 꽉 차게(object-fit: cover)
   - 배경/그림자/블러/페이드 없음 */
export default function TurnCharacterPanel({ currentPlayer }) {
  /* 현재 플레이어의 캐릭터 데이터 */
  const ch = useMemo(() => getCharacter(currentPlayer?.characterId), [currentPlayer?.characterId]);

  /* 표시할 이미지 우선순위 */
  const portrait = ch?.selectBasicImage || ch?.iconIdle || ch?.roomListImage || null;

  /* currentPlayer 없으면 렌더링하지 않음 */
  if (!currentPlayer) return null;

  return (
    <div className="turn-character" style={styles.box} aria-label="현재 차례 캐릭터">
      {portrait ? (
        <img
          className="turn-character-img"
          style={styles.img}
          src={portrait}
          alt=""
          draggable={false}
        />
      ) : null}
    </div>
  );
}

const styles = {
  /* 캐릭터 박스(1920x1080 기준 비율) */
  box: {
    width: '16.6667vw',
    height: '48.1481vh',
    overflow: 'hidden',
    pointerEvents: 'none',
    userSelect: 'none',
  },

  /* 캐릭터 이미지(박스에 꽉 차게) */
  img: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center',
    filter: 'none',
    transform: 'none',
  },
};
