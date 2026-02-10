import React, { useEffect, useMemo, useState } from 'react';
import PlayerMarker from './PlayerMarker.jsx';
import './css/MainBoardPage.css';

const MainBoardPage = ({
                         players,
                         movePath,
                         currentPlayerId,
                         onMoveComplete,
                       }) => {
  // movePath 기반 이동 애니메이션용 임시 position 상태
  const [animatingPosition, setAnimatingPosition] = useState(null);

  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (movePath && movePath.length > 0) {
      const timers = [];
      setIsAnimating(true);

      movePath.forEach((position, index) => {
        const timer = setTimeout(() => {
          setAnimatingPosition(position);
        }, index * 500);
        timers.push(timer);
      });

      const finalPosition = movePath[movePath.length - 1];

      const doneTimer = setTimeout(() => {
        setAnimatingPosition(finalPosition);
        setIsAnimating(false);
        onMoveComplete?.();
      }, movePath.length * 500 + 200);

      timers.push(doneTimer);

      return () => timers.forEach((t) => clearTimeout(t));
    }
  }, [movePath, onMoveComplete]);

  // 서버/상태(players)가 최종 위치로 갱신되면 그때 animatingPosition 해제
  useEffect(() => {
    if (animatingPosition === null) return;
    if (isAnimating) return;

    const me = (players || []).find(
      (p) => Number(p?.memberId) === Number(currentPlayerId)
    );
    if (!me) return;

    const serverPos = Number(me?.position);
    const finalPos = Number(animatingPosition);

    if (Number.isFinite(serverPos) && Number.isFinite(finalPos) && serverPos === finalPos) {
      setAnimatingPosition(null);
    }
  }, [players, currentPlayerId, animatingPosition, isAnimating]);

  // 타일별 슬롯 인덱스 및 인원 수 계산
  const { slotIndexByMemberId, countByPosition } = useMemo(() => {
    const slotMap = new Map(); // memberId -> slotIndex
    const countMap = new Map(); // position -> count
    const byPos = new Map(); // position -> players[]

    (players || []).forEach((p) => {
      const pos = Number(p?.position);
      if (!Number.isFinite(pos)) return;
      if (!byPos.has(pos)) byPos.set(pos, []);
      byPos.get(pos).push(p);
    });

    byPos.forEach((arr, pos) => {
      countMap.set(Number(pos), arr.length);

      const sorted = arr
        .slice()
        .sort((a, b) => (Number(a?.memberId) || 0) - (Number(b?.memberId) || 0));

      sorted.forEach((p, idx) => {
        slotMap.set(Number(p?.memberId), idx); // 0~3
      });
    });

    return { slotIndexByMemberId: slotMap, countByPosition: countMap };
  }, [players]);

  return (
    <div className="game-board">
      <div className="board-layer">
        {(players || []).map((player) => {
          const memberId = Number(player?.memberId);
          const slotIndex = slotIndexByMemberId.get(memberId) ?? 0;
          const isCurrent = Number(memberId) === Number(currentPlayerId);
          const finalPos =
            isCurrent && animatingPosition !== null ? animatingPosition : player?.position;
          const posNum = Number(finalPos ?? player?.position);
          const countOnTile = Number.isFinite(posNum) ? (countByPosition.get(posNum) ?? 1) : 1;
          const isMovingMarker = isCurrent && isAnimating;

          return (
            <PlayerMarker
              key={player.memberId}
              player={player}
              animatingPosition={finalPos}
              slotIndex={slotIndex}
              countOnTile={countOnTile}
              isMoving={isMovingMarker}
            />
          );
        })}
      </div>
    </div>
  );
};

export default MainBoardPage;
