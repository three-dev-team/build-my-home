import { boardTiles } from '../../constants/boardData';
import './css/PlayerMarker.css';

const PlayerMarker = ({ player, animatingPosition }) => {
  // animatingPosition이 있으면 그 위치, 없으면 player.position
  const position = animatingPosition ?? player.position;
  const tile = boardTiles.find((t) => t.id === position);

  if (!tile) return null;

  return (
    <div
      className="player-marker"
      style={{
        left: tile.x,
        top: tile.y,
        transition: 'all 0.4s ease-in-out',
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
