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
  const isMovingNow = animatingPosition !== null;

  useEffect(() => {
    // movePath 기반 position 단계 갱신 처리
    if (movePath && movePath.length > 0) {
      const timers = [];

      // movePath step별 animatingPosition 설정 타이머 등록
      movePath.forEach((position, index) => {
        const timer = setTimeout(() => setAnimatingPosition(position), index * 500);
        timers.push(timer);
      });

      // 애니메이션 종료 처리 및 onMoveComplete 콜백 호출
      const finalPositionTimer = setTimeout(() => {
        setAnimatingPosition(null);
        onMoveComplete?.();
      }, movePath.length * 500 + 200);

      timers.push(finalPositionTimer);

      // 타이머 정리 처리
      return () => timers.forEach((t) => clearTimeout(t));
    }
  }, [movePath, onMoveComplete]);

  // 타일별 슬롯 인덱스 및 인원 수 계산
  const { slotIndexByMemberId, countByPosition } = useMemo(() => {
    const slotMap = new Map(); // memberId -> slotIndex
    const countMap = new Map(); // position -> count
    const byPos = new Map(); // position -> players[]

    // position 기준 플레이어 그룹핑 처리
    (players || []).forEach((p) => {
      const pos = Number(p?.position);
      if (!Number.isFinite(pos)) return;
      if (!byPos.has(pos)) byPos.set(pos, []);
      byPos.get(pos).push(p);
    });

    // position별 인원 수 집계 및 슬롯 인덱스 부여 처리
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
        {/* 플레이어 말 렌더링 */}
        {(players || []).map((player) => {
          const memberId = Number(player?.memberId);

          // memberId 기준 고정 슬롯 인덱스
          const slotIndex = slotIndexByMemberId.get(memberId) ?? 0;

          // 현재 플레이어 이동 중 position 우선 적용
          const finalPos =
            Number(player?.memberId) === Number(currentPlayerId) && animatingPosition !== null
              ? animatingPosition
              : player?.position;

          // 동일 타일 인원 수 기반 오프셋 분산용 countOnTile
          const posNum = Number(finalPos ?? player?.position);
          const countOnTile = Number.isFinite(posNum) ? (countByPosition.get(posNum) ?? 1) : 1;

          // 현재 턴 말만 이동 transition ON
          const isCurrent = Number(player?.memberId) === Number(currentPlayerId);
          const isMovingMarker = isCurrent && isMovingNow;

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
