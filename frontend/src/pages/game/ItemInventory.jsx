import { resolveItemKey } from '../../constants/items.js';
import './css/ItemInventory.css';
import OkButton from '../../components/common/OkButton.jsx';
import ExitButton from '../../components/common/ExitButton.jsx';

const ItemInventory = ({ items, isMyTurn, selectedIdx, onAction, onClose }) => {
  const selectedItem = selectedIdx !== null && selectedIdx !== undefined ? items[selectedIdx] : null;
  const selectedInfo = selectedItem ? resolveItemKey(selectedItem) : null;

  const handleSelect = (idx) => {
    if (!isMyTurn) return;
    onAction('SELECT_ITEM_TO_USE', { actionData: idx });
  };

  const handleUse = () => {
    if (selectedIdx === null || selectedIdx === undefined || !isMyTurn) return;
    onAction('USE_ITEM', {
      actionData: selectedIdx,
      actionDataStr: selectedItem,
    });
  };

  return (
    <div className="item-inventory-overlay">
      <div className="item-inventory-container">
        {/* 아이템 박스 영역 */}
        <div className="item-inventory-box-area">
          {items?.map((item, idx) => {
            const info = resolveItemKey(item) || { image: '', name: '아이템' };
            const isSelected = selectedIdx === idx;
            return (
              <div
                key={idx}
                className={`item-inventory-card ${isSelected ? 'selected' : ''} ${isMyTurn ? 'clickable' : ''}`}
                onClick={() => handleSelect(idx)}
              >
                <img src={info.image} alt={info.name} className="item-inventory-image" />
              </div>
            );
          })}
        </div>

        {/* 선택된 아이템 정보 */}
        {selectedInfo && (
          <>
            <div className="item-inventory-name-box">{selectedInfo.name}</div>
            <div className="item-inventory-divider" />
            <div className="item-inventory-description-box">{selectedInfo.desc}</div>
          </>
        )}

        {!selectedInfo && <div className="item-inventory-placeholder">아이템을 선택해주세요</div>}
      </div>

      {/* 버튼 - 컨테이너 밖, overlay 안 */}
      <OkButton onClick={handleUse} label="사용하기" disabled={selectedIdx === null || !isMyTurn} />
      <ExitButton onClick={onClose} label="닫기" />
    </div>
  );
};

export default ItemInventory;
