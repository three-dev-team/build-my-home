import React from 'react';
import { boardTiles } from '../../constants/boardData';
import PlayerMarker from './PlayerMarker.jsx';
import './css/MainBoardPage.css';

const MainBoardPage = ({ players }) => {
  return (
    <div className="game-board">
      {/* 타일들 렌더링 */}
      {boardTiles.map((tile) => (
        <div key={tile.id} className="tile" style={{ left: tile.x, top: tile.y }}>
          {tile.name}
        </div>
      ))}

      {/* 플레이어 말들 렌더링 */}
      {players.map((player) => (
        <PlayerMarker key={player.memberId} player={player} />
      ))}
    </div>
  );
};

export default MainBoardPage;
