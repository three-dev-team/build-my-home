import './css/PlayerActionPanel.css';

const PlayerActionPanel = ({ onSelectDice, onSelectItem, onSelectMap, items, isMyTurn }) => {
    if (!isMyTurn) return null;

    return (
        <div className="player-action-panel">
            <button className="action-btn dice" onClick={onSelectDice} disabled={!isMyTurn}>
                <span className="icon">🎲</span>
                <span className="label">주사위</span>
            </button>
            <button
                className="action-btn item"
                onClick={onSelectItem}
                disabled={!isMyTurn || !items || items.length === 0}
            >
                <span className="icon">📦</span>
                <span className="label">아이템</span>
            </button>
            <button className="action-btn map" onClick={onSelectMap} disabled={!isMyTurn}>
                <span className="icon">🗺️</span>
                <span className="label">맵</span>
            </button>
        </div>
    );
};

export default PlayerActionPanel;