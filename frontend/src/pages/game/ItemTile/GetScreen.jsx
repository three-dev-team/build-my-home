import React from 'react';
import BubbleBasic from '../../../components/common/BubbleBasic.jsx';
import { ITEM_INFO } from '../../../constants/gameConstants.js';

const GetScreen = ({ newItem }) => {
  const item = ITEM_INFO[newItem] || { emoji: '📦', name: '아이템' };

  return (
    <div className="flex-1 flex flex-col items-center justify-center relative">
      <div className="relative">
        <img src="#" alt="Get" className="h-[50vh] object-contain drop-shadow-lg" />
        <div className="absolute top-[30%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-bounce">
          <div className="text-9xl drop-shadow-2xl">{item.emoji}</div>
        </div>
      </div>

      <BubbleBasic showArrow>
        <span className="text-[#E76C21] font-bold">{item.name}</span>을 얻었다!
      </BubbleBasic>
    </div>
  );
};

export default GetScreen;
