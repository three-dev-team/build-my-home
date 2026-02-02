import { useMemo } from 'react';
import { CHARACTERS } from '../../constants/characters.js';

// characterId -> 캐릭터 메타
const getCharacter = (characterId) => {
  const id = Number(characterId);
  return CHARACTERS.find((c) => Number(c.id) === id) || null;
};

export default function MyCharacterPanel({ players = [], myId }) {
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

  const ch = useMemo(() => {
    if (!myPlayer) return null;
    return getCharacter(myPlayer?.characterId);
  }, [myPlayer]);

  const portrait = useMemo(
    () => ch?.selectBasicImage || ch?.iconIdle || ch?.roomListImage || null,
    [ch]
  );

  if (!myPlayer) return null;

  return (
    <div className="turn-character" aria-label="내 캐릭터">
      {portrait ? (
        <img className="turn-character-img" src={portrait} alt="" draggable={false} />
      ) : null}
    </div>
  );
}
