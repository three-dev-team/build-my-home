import BubbleBasic from '../../../components/common/BubbleBasic.jsx';
import { ITEM_INFO } from '../../../constants/gameConstants.js';

const SelectScreen = ({ playerName, inventory, newItem, isMyTurn, selectedIdx, onAction }) => {
  const newItemObj = ITEM_INFO[newItem] || { emoji: '📦', name: '새 아이템' };

  // 기존 인벤토리(최대 3개) + 새 아이템 1개 = 총 4개
  const allItems = [
    ...inventory.map((itemKey) => ITEM_INFO[itemKey] || { emoji: '📦', name: '알 수 없음' }),
    { ...newItemObj, isNew: true },
  ];

  const handleSelect = (idx) => {
    if (!isMyTurn) return;
    onAction('SELECT_ITEM_TO_DROP', { actionData: idx });
  };

  const handleConfirm = () => {
    if (selectedIdx === null || selectedIdx === undefined || !isMyTurn) return;

    // 마지막 인덱스(3) 선택 시 새 아이템을 버리는 것, 0~2 선택 시 기존 것과 교체
    onAction('HANDLE_INVENTORY_FULL', { actionData: selectedIdx });
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center relative w-full h-full bg-black/20 backdrop-blur-sm">
      {/* 아이템 선택 그리드 UI */}
      <div className="bg-[#F0F2EB] p-8 rounded-[50px] shadow-2xl border-4 border-white mb-36 max-w-lg w-[90%]">
        <div className="grid grid-cols-2 gap-4">
          {allItems.map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              disabled={!isMyTurn}
              className={`
                relative aspect-square rounded-[32px] flex flex-col items-center justify-center border-4 transition-all
                ${selectedIdx === idx ? 'bg-[#FDF6D6] border-[#E76C21] scale-105 shadow-md' : 'bg-white border-[#C5D0C6] hover:bg-white/80'}
              `}
            >
              <div className="text-5xl mb-2">{item.emoji}</div>
              <div className="text-sm font-bold text-[#594E36]">{item.name}</div>

              {item.isNew && (
                <span className="absolute -top-2 -right-2 bg-[#E76C21] text-white text-[11px] px-2.5 py-1 rounded-full font-extrabold shadow-sm animate-pulse">
                  NEW
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <BubbleBasic speaker={playerName}>
        {selectedIdx === null ? (
          '주머니가 가득해! 무엇을 버릴까?.'
        ) : (
          <div className="flex flex-col items-center gap-2">
            <p>
              <span className="text-[#E76C21] font-bold">{allItems[selectedIdx].name}</span>
              을(를) 버릴까?
            </p>
            <button
              onClick={handleConfirm}
              className="bg-[#E76C21] text-white px-10 py-2 rounded-full font-bold shadow-md active:scale-95 transition-transform"
            >
              결정하기
            </button>
          </div>
        )}
      </BubbleBasic>
    </div>
  );
};

export default SelectScreen;
