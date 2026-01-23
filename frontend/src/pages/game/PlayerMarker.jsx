// PlayerMarker.jsx
import { boardTiles } from '../../constants/boardData';
import './css/PlayerMarker.css';

const PlayerMarker = ({ player }) => {
  const tile = boardTiles.find((t) => t.id === player.position);

  if (!tile) return null;

  return (
    <div
      className="player-marker"
      style={{
        left: tile.x,
        top: tile.y,
        transition: 'all 0.5s ease-in-out', // 이동 애니메이션 추가 추천
      }}
    >
      <div className="marker-wrapper">
        <img
          src={`/assets/characters/char_${player.characterId}.png`}
          alt={player.nickname}
          className="character-img"
        />
      </div>
    </div>
  );
};

export default PlayerMarker;
