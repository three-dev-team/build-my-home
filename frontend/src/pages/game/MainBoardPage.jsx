import React, { useState, useEffect } from 'react';
import { boardTiles } from '../../constants/boardData';
import PlayerMarker from './PlayerMarker.jsx';
import './css/MainBoardPage.css';

const MainBoardPage = ({ players, movePath, currentPlayerId, onMoveComplete }) => {
  const [animatingPosition, setAnimatingPosition] = useState(null);

  useEffect(() => {
    if (movePath && movePath.length > 0) {
      const timers = []; // 실행될 타이머들을 담아둘 바구니

      // movePath의 각 위치마다 500ms 간격으로 타이머 설정
      movePath.forEach((position, index) => {
        const timer = setTimeout(() => setAnimatingPosition(position), index * 500);
        timers.push(timer);
      });

      const finalPositionTimer = setTimeout(
        () => {
          setAnimatingPosition(null);
          onMoveComplete?.();
        },
        movePath.length * 500 + 200,
      );
      timers.push(finalPositionTimer);

      // [Cleanup] 컴포넌트가 다시 그려질 때 이전 타이머들 다 취소!
      return () => timers.forEach((t) => clearTimeout(t));
    }
  }, [movePath]);

  return (
    <div className="game-board">
      {/* 타일들 렌더링 */}
      {boardTiles.map((tile) => (
        <div key={tile.id} className="tile" style={{ left: tile.x, top: tile.y }}>
          {tile.name}
        </div>
      ))}

      {/* 플레이어 말들 렌더링 */}
      {players.map((player) => {
        return (
          <PlayerMarker
            key={player.memberId}
            player={player}
            animatingPosition={
              player.memberId === currentPlayerId && animatingPosition !== null ? animatingPosition : player.position
            }
          />
        );
      })}
    </div>
  );
};

export default MainBoardPage;
