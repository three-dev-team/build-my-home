import { useMemo } from 'react';
import { CHARACTERS } from '../../constants/characters.js';

// characterId로 캐릭터 메타 찾기
const getCharacter = (characterId) => {
  const id = Number(characterId);
  return CHARACTERS.find((c) => Number(c.id) === id) || null;
};

export default function TurnCharacterPanel({ players = [], currentPlayerId }) {
  // players 형태(배열/객체)와 상관없이 배열로 정규화
  const playersArr = useMemo(() => {
    if (Array.isArray(players)) return players;
    if (players && typeof players === 'object') return Object.values(players);
    return [];
  }, [players]);

  // currentPlayerId에 해당하는 플레이어 찾기(memberId/playerId/id 순으로 시도)
  const targetPlayer = useMemo(() => {
    const targetIdNum = Number(currentPlayerId);
    if (!targetIdNum || playersArr.length === 0) return null;

    return (
      playersArr.find((p) => Number(p?.memberId) === targetIdNum) ||
      playersArr.find((p) => Number(p?.playerId) === targetIdNum) ||
      playersArr.find((p) => Number(p?.id) === targetIdNum) ||
      null
    );
  }, [playersArr, currentPlayerId]);

  // 타겟 플레이어의 characterId로 캐릭터 메타 가져오기
  const ch = useMemo(() => {
    if (!targetPlayer) return null;
    return getCharacter(targetPlayer?.characterId);
  }, [targetPlayer]);

  // 표시할 이미지 후보(우선순위 적용)
  const portrait = useMemo(
    () => ch?.selectBasicImage || ch?.iconIdle || ch?.roomListImage || null,
    [ch]
  );

  if (!targetPlayer) return null;

  return (
    <div className="turn-character" aria-label="현재 턴 캐릭터">
      {portrait ? (
        <img className="turn-character-img" src={portrait} alt="" draggable={false} />
      ) : null}
    </div>
  );
}
