import './css/PlayerActionPanel.css';
import { ITEM_INFO } from '../../constants/gameConstants.js';

const PlayerActionPanel = ({
  onSelectDice,
  onSelectItem,
  onBuildHouse,
  onATM,
  onInventory,
  items,
  isMyTurn,
  itemUsed,
}) => {
  if (!isMyTurn) return null;

  return (
    <div className="player-action-panel">
      <button className="action-btn dice" onClick={onSelectDice} disabled={!isMyTurn}>
        <span className="icon"></span>
        <span className="label">주사위</span>
      </button>
      <button
        className="action-btn item"
        onClick={onSelectItem}
        disabled={!isMyTurn || !items || items.length === 0 || itemUsed}
      >
        <span className="label">아이템</span>
        {/* 아이템 미리보기 */}
        <div className="flex gap-2 justify-center mt-1 items-center">
          {Array.from({ length: 3 }).map((_, idx) => {
            const itemKey = items && items[idx];

            return (
              <div key={idx} className="flex items-center justify-center min-w-[1.5rem]">
                {itemKey ? (
                  <span className="text-xl animate-pop-in">{ITEM_INFO[itemKey]?.emoji || '📦'}</span>
                ) : (
                  <span className="text-[#594E36] opacity-30 font-bold text-lg">·</span>
                )}
              </div>
            );
          })}
        </div>
      </button>
      <button className="action-btn map" onClick={onBuildHouse} disabled={!isMyTurn || itemUsed}>
        <span className="icon">🏠</span>
        <span className="label">마을회관</span>
      </button>
      <button className="action-btn map" onClick={onATM} disabled={!isMyTurn || itemUsed}>
        <span className="icon">🏧</span>
        <span className="label">ATM</span>
      </button>
      <button className="action-btn map" onClick={onInventory} disabled={!isMyTurn || itemUsed}>
        <span className="icon">📦</span>
        <span className="label">인벤토리</span>
      </button>
    </div>
  );
};

export default PlayerActionPanel;
