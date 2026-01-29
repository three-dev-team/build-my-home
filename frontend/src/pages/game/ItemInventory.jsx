import { ITEM_INFO } from '../../constants/gameConstants.js';

const ItemInventory = ({ items, isMyTurn, selectedIdx, onAction, onClose }) => {
  const selectedItem = selectedIdx !== null && selectedIdx !== undefined ? items[selectedIdx] : null;
  const selectedInfo = selectedItem ? ITEM_INFO[selectedItem] : null;

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
      <div className="bg-white/90 backdrop-blur-md rounded-3xl p-8 shadow-2xl max-w-lg w-[90%]">
        {/* 아이템 목록 */}
        <div className="flex justify-center gap-4 mb-6">
          {items?.map((item, idx) => {
            const info = ITEM_INFO[item] || { emoji: '📦', name: '아이템' };
            const isSelected = selectedIdx === idx;
            return (
              <button
                key={idx}
                onClick={() => handleSelect(idx)}
                disabled={!isMyTurn}
                className={`
                  w-24 h-24 rounded-2xl border-4 flex items-center justify-center transition-all
                  ${
                    isSelected
                      ? 'bg-white border-[#E76C21] scale-110 shadow-lg'
                      : 'bg-gray-100 border-gray-300 hover:border-gray-400'
                  }
                `}
              >
                <span className="text-5xl">{info.emoji}</span>
              </button>
            );
          })}
        </div>

        {/* 선택된 아이템 정보 */}
        <div className="bg-gray-100 rounded-2xl p-6 mb-6 min-h-[120px]">
          {selectedInfo ? (
            <>
              <h3 className="text-xl font-bold text-center mb-2">{selectedInfo.name}</h3>
              <hr className="border-gray-300 mb-3" />
              <p className="text-center text-gray-600">{selectedInfo.description}</p>
            </>
          ) : (
            <p className="text-center text-gray-400">아이템을 선택해주세요</p>
          )}
        </div>

        {/* 버튼 */}
        <div className="flex gap-4">
          <button onClick={onClose} className="flex-1 bg-gray-300 hover:bg-gray-400 py-3 rounded-full font-bold">
            닫기
          </button>
          <button
            onClick={handleUse}
            disabled={selectedIdx === null || !isMyTurn}
            className="flex-1 bg-[#E76C21] hover:bg-[#d15a15] disabled:bg-gray-300 py-3 rounded-full font-bold text-white"
          >
            사용하기
          </button>
        </div>
      </div>
    </div>
  );
};

export default ItemInventory;
