import React, { useCallback, useEffect } from 'react';
import BubbleBasic from '../../../components/common/BubbleBasic.jsx';
import Subtitle from '../../../components/common/Subtitle.jsx';

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
      <Subtitle
        nameText={playerName}
        contentText="무언가를 발견했어..."
        options={[
          { text: '확인해보자', onClick: handleClick },
          { text: '누가보냈지?', onClick: handleClick },
        ]}
        optionDisabled={!isMyTurn}
      />
    </div>
  );
};

export default DiscoverScreen;
