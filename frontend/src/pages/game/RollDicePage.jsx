import React from 'react';
import Dice3D from '../../components/dice/Dice3D.jsx';

const RollDicePage = ({ currentPlayer, isMyTurn, diceValue, isRolling, onRollComplete, onAnimationEnd }) => {
  // 스페이스바 핸들러
  const handleKeyDown = (e) => {
    if (e.code === 'Space' && isMyTurn && !isRolling) {
      onRollComplete();
    }
  };

  React.useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMyTurn, isRolling]);

  return (
    <div className="fixed inset-0 w-screen h-screen flex flex-col items-center justify-center bg-gray-100">
      {/* 주사위 영역 */}
      <div className="w-64 h-48 flex items-center justify-center mb-8">
        {isRolling && diceValue ? (
          <Dice3D value={diceValue} onAnimationEnd={onAnimationEnd} />
        ) : (
          <img src="/images/dice/dice-idle.png" alt="주사위" className="w-32 h-32 object-contain" />
        )}
      </div>

      {/* 사용자 캐릭터 + 안내 문구 */}
      <div className="w-64 h-64 bg-[#6b8e5e] flex flex-col items-center justify-center text-white rounded-2xl">
        <div className="flex-1 flex items-center justify-center">
          <img
            src={`/assets/characters/char_${currentPlayer?.characterId}.png`}
            alt={currentPlayer?.nickname}
            className="w-24 h-24 object-contain"
          />
        </div>

        <div className="pb-4 text-sm text-center">
          {isRolling ? (
            <span>{diceValue}칸 이동!</span>
          ) : isMyTurn ? (
            <span>스페이스바를 눌러 주사위를 굴리세요</span>
          ) : (
            <span>{currentPlayer?.nickname}의 차례입니다...</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default RollDicePage;
