import "./css/PlayerStatusPanel.css";

const getRankText = (index) => {
  const rank = index + 1;
  if (rank === 1) return "1st";
  if (rank === 2) return "2nd";
  if (rank === 3) return "3rd";
  return `${rank}th`;
};

const PlayerStatusPanel = ({ players, currentPlayerId, myId }) => {
  // 순위순 정렬 (집 레벨 높은 순 → 벨 많은 순)
  const sortedPlayers = [...players].sort((a, b) => {
    if (b.houseLevel !== a.houseLevel) return b.houseLevel - a.houseLevel;
    return b.bell - a.bell;
  });

  return (
    <div className="player-status-panel">
      {sortedPlayers.map((player, index) => {
        const isCurrentTurn = player.memberId === currentPlayerId;
        const isMe = player.memberId === myId;

        return (
          <div
            key={player.memberId}
            className={`player-card ${isCurrentTurn ? "current-turn" : ""} ${isMe ? "my-card" : ""}`}
          >
            <div className="rank">{getRankText(index)}</div>
            <div className="player-info">
              <div className="nickname">{player.nickname}</div>
              <div className="stats">
                <span>💰{player.bell}</span>
                {player.loan > 0 && (
                  <span style={{ color: "#ff6b6b", marginLeft: "8px" }}>
                    📉{player.loan}
                  </span>
                )}
                <span>🏠 Lv.{player.houseLevel}</span>
              </div>
              <div className="items">
                {player.items?.length > 0 ? (
                  player.items.map((item, i) => <span key={i}>📦</span>)
                ) : (
                  <span className="no-items">아이템 없음</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PlayerStatusPanel;
