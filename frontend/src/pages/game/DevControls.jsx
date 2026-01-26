// 테스트 위한 임시 컴포넌트
const DevControls = ({ onStatusChange, onSetLastRound }) => {
  // 개발 환경에서만 렌더링
  if (import.meta.env.PROD) return null;

  return (
    <div className="fixed bottom-4 right-4 z-9999 flex flex-col gap-2 bg-black/50 p-4 rounded-lg backdrop-blur-sm">
      <p className="text-white text-xs font-bold mb-1 text-center">DEV CONTROLS</p>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onStatusChange('WAITING_LOAN')}
          className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded shadow"
        >
          🏦 은행 (Loan)
        </button>
        <button
          onClick={() => onStatusChange('WAITING_STAMP')}
          className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded shadow"
        >
          ✨ 스탬프 (Stamp)
        </button>
        <button
          onClick={() => onStatusChange('WAITING_DICE')}
          className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded shadow"
        >
          🎲 주사위 굴리기 (RollDicePage)
        </button>
        <button
          onClick={() => onStatusChange('WAITING_KK')}
          className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white text-xs rounded shadow"
        >
          🎵 KK (Music)
        </button>
        <button
          onClick={() => onStatusChange('WAITING_PLAYER_ACTION')}
          className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded shadow"
        >
          ⏎ 맵으로 돌아가기
        </button>
        <button
          onClick={() => onStatusChange('WAITING_SHOP_ITEM')}
          className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white text-xs rounded shadow"
        >
          아이템 상점
        </button>
        <button
          onClick={() => onStatusChange('WAITING_SHOP_RESOURCE')}
          className="px-3 py-1 bg-pink-500 hover:bg-pink-600 text-white text-xs rounded shadow"
        >
          재화 상점
        </button>
        <button
          onClick={() => onStatusChange('WAITING_FISHING')}
          className="px-3 py-1 bg-cyan-500 hover:bg-cyan-600 text-white text-xs rounded shadow"
        >
          🎣 낚시 (Fishing)
        </button>
        <button
          onClick={() => onStatusChange('WAITING_MACHURILLA')}
          className="px-3 py-1 bg-purple-500 hover:bg-purple-600 text-white text-xs rounded shadow"
        >
          🔮 마추릴라
        </button>
        <button
          onClick={() => onStatusChange('WAITING_ITEMS')}
          className="px-3 py-1 bg-purple-500 hover:bg-purple-600 text-white text-xs rounded shadow"
        >
          📦 아이템칸
        </button>
        <button
          onClick={onSetLastRound}
          className="col-span-2 px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded shadow font-bold border-2 border-red-700"
        >
          ⏩ 막판 가기 (Jump to Last Round)
        </button>
      </div>
    </div>
  );
};

export default DevControls;
