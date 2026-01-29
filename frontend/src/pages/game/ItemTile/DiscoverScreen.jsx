import React, { useCallback, useEffect } from 'react';
import BubbleBasic from '../../../components/common/BubbleBasic.jsx';

const DiscoverScreen = ({ playerName, isMyTurn, onAction }) => {
  const handleClick = useCallback(() => {
    if (!isMyTurn) return;
    onAction('GET_RANDOM_ITEM', {});
  }, [isMyTurn, onAction]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isMyTurn && (e.code === 'Space' || e.code === 'Enter')) {
        e.preventDefault();
        handleClick();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMyTurn, handleClick]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center relative">
      {/* 캐릭터 이미지 */}
      <img src="#" alt="캐릭터 이미지" className="h-[50vh] object-contain" />
      <BubbleBasic speaker={playerName}>무언가를 발견했어...</BubbleBasic>
      {isMyTurn && (
        <button onClick={handleClick} className="mt-4 bg-[#E76C21] text-white px-8 py-2 rounded-full font-bold">
          확인하기
        </button>
      )}
    </div>
  );
};

export default DiscoverScreen;
