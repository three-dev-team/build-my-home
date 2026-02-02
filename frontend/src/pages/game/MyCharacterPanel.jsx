import { useMemo } from 'react';
import { CHARACTERS } from '../../constants/characters.js';

// characterId로 캐릭터 메타(이미지 경로 등) 조회
const getCharacter = (characterId) => {
  const id = Number(characterId);
  return CHARACTERS.find((c) => Number(c.id) === id) || null;
};

export default function MyCharacterPanel({ players = [], myId }) {
  // players에서 "내 플레이어" 객체 찾기 (DTO마다 id 키가 다를 수 있어 3가지 케이스 대응)
  const myPlayer = useMemo(() => {
    const myIdNum = Number(myId);
    if (!myIdNum || !Array.isArray(players)) return null;

    return (
      players.find((p) => Number(p?.memberId) === myIdNum) ||
      players.find((p) => Number(p?.playerId) === myIdNum) ||
      players.find((p) => Number(p?.id) === myIdNum) ||
      null
    );
  }, [players, myId]);

  // 내 플레이어를 못 찾으면 표시하지 않음
  if (!myPlayer) return null;

  // 내 캐릭터 정보(이미지 소스 포함) 가져오기
  const ch = useMemo(() => getCharacter(myPlayer?.characterId), [myPlayer?.characterId]);

  // 사용할 초상화 이미지: 선택 화면용 > 아이들 > 룸리스트(없으면 null)
  const portrait = ch?.selectBasicImage || ch?.iconIdle || ch?.roomListImage || null;

  return (
    <div className="turn-character" style={styles.box} aria-label="내 캐릭터">
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
  // 1920x1080 기준 비율로 캐릭터 표시 영역 고정
  box: {
    width: '16.6667vw',
    height: '48.1481vh',
    overflow: 'hidden',
    pointerEvents: 'none',
    userSelect: 'none',
  },

  // 박스를 꽉 채우되, 얼굴이 보이도록 상단 기준으로 크롭
  img: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center top',
    filter: 'none',
    transform: 'none',
  },
};
