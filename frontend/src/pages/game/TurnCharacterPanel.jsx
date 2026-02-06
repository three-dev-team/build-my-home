import { useMemo } from 'react';
import { CHARACTERS } from '../../constants/characters.js';
import { COLORS, withAlpha } from '../../constants/colors.js';

// characterId로 캐릭터 메타 조회
const getCharacter = (characterId) => {
  const id = Number(characterId);
  return CHARACTERS.find((c) => Number(c.id) === id) || null;
};

export default function TurnCharacterPanel({ players = [], currentPlayerId }) {
  // players 입력(배열/객체)을 배열로 정규화
  const playersArr = useMemo(() => {
    if (Array.isArray(players)) return players;
    if (players && typeof players === 'object') return Object.values(players);
    return [];
  }, [players]);

  // 현재 턴 플레이어 탐색(memberId -> playerId -> id)
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

  // 현재 턴 캐릭터 메타 추출
  const ch = useMemo(() => {
    if (!targetPlayer) return null;
    return getCharacter(targetPlayer?.characterId);
  }, [targetPlayer]);

  // 표시 이미지 우선순위(selectBasic -> iconIdle -> roomListImage)
  const portrait = useMemo(
    () => ch?.selectBasicImage || ch?.iconIdle || ch?.roomListImage || null,
    [ch]
  );

  const phBg = useMemo(() => withAlpha(COLORS.ac.black, 0.12), []);
  const phBorder = useMemo(() => withAlpha(COLORS.ac.white, 0.18), []);

  if (!targetPlayer) return null;

  return (
    <div className="turn-character" aria-label="현재 턴 캐릭터">
      {portrait ? (
        <img className="turn-character-img" src={portrait} alt="" draggable={false} />
      ) : (
        // 이미지 미존재 시 플레이스홀더로 레이아웃 유지
        <div
          className="turn-character-ph"
          aria-hidden
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '9999px',
            background: phBg,
            border: `0.1042cqw solid ${phBorder}`, // 1920 기준 2px
            boxSizing: 'border-box',
          }}
        />
      )}
    </div>
  );
}
