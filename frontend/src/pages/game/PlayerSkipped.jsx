import { useGameTimer } from '../../hooks/useGameTimer.js';
import { useExitHandler } from '../../hooks/useExitHandler.js';

const PlayerSkipped = ({ isMyTurn, currentPlayerName, onExit }) => {
  const handleExit = useExitHandler(isMyTurn, onExit);
  useGameTimer(5, handleExit);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-[100]">
      <div className="bg-white rounded-3xl p-12 text-center">
        <div className="text-6xl mb-4">😴</div>
        <h2 className="text-2xl font-bold">zzz...</h2>
        <h2 className="text-2xl font-bold">{currentPlayerName} 피곤해서 자는 거 같다...</h2>
        <p className="text-gray-500 mt-4">잠시 후 다음 차례로 넘어갑니다...</p>
      </div>
    </div>
  );
};

export default PlayerSkipped;
