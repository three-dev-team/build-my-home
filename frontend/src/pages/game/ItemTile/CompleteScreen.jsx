import React from 'react';
import BubbleBasic from '../../../components/common/BubbleBasic.jsx';

const CompleteScreen = ({ playerName }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center relative">
      <img src="#" alt="Success" className="h-[50vh] object-contain drop-shadow-lg" />
      <BubbleBasic speaker={playerName}>좋아! 주머니 정리가 다 됐어!{'\n'}이제 다시 가볼까?</BubbleBasic>
    </div>
  );
};

export default CompleteScreen;
