import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import BubbleBasic from '../../../components/common/BubbleBasic.jsx';
import { useGameTimer } from '../../../hooks/useGameTimer.js';

const Pipe = ({ isMyTurn, actionDataStr, onAction }) => {
  const [isEntering, setIsEntering] = useState(true); // 들어가는 중
  const [showExitAnimation, setShowExitAnimation] = useState(false); // 나오는 중

  // actionDataStr 파싱 (예: "PIPE:5:18")
  const [_, oldPos, newPos] = actionDataStr ? actionDataStr.split(':') : [null, '?', '?'];

  // 연출 흐름 제어
  useEffect(() => {
    // 1. 1.5초 후 토관 속으로 완전히 들어감
    const enterTimer = setTimeout(() => {
      setIsEntering(false);
    }, 1500);

    // 2. 2.5초 후 새로운 위치에서 토관 밖으로 나옴
    const exitTimer = setTimeout(() => {
      setShowExitAnimation(true);
    }, 2500);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
    };
  }, []);

  // 모든 연출 종료 후
  const handleComplete = () => {
    if (!isMyTurn) return;
    onAction('PIPE_COMPLETE', {});
  };

  useGameTimer(isMyTurn ? 5 : null, handleComplete);

  return (
    <div className="relative w-full h-full overflow-hidden flex items-center justify-center bg-[#87CEEB]">
      {/* 배경 이미지 (해변/필드) */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-opacity duration-500"
        style={{ backgroundImage: 'url(/images/bg/beach_field.jpeg)' }}
      />

      {/* --- 캐릭터 및 토관 영역 --- */}
      <div className="relative z-10 flex flex-col items-center mt-20">
        {/* 캐릭터 애니메이션 컨테이너 */}
        <div className="relative w-64 h-80 overflow-hidden flex items-end justify-center">
          <motion.img
            src="/images/character/bingti_basic.webp"
            alt="Character"
            className="w-48 object-contain mb-8"
            initial={{ y: 0 }}
            animate={
              // 1단계: Entering이 true면 대기, false가 되는 순간(1.5초) 밑으로 쑥 들어감
              // 2단계: ExitAnimation이 true가 되면 다시 0 위치로 올라옴
              !isEntering && !showExitAnimation ? { y: 250 } : showExitAnimation ? { y: 0 } : { y: 0 }
            }
            transition={{
              duration: 0.8,
              ease: showExitAnimation ? 'backOut' : 'easeInOut',
            }}
          />
        </div>

        {/* 토관 이미지 - 캐릭터보다 앞에 위치하도록 z-index 설정 */}
        <img src="/images/item/pipe.webp" alt="Pipe" className="w-48 h-auto z-20 -mt-12 select-none" />
      </div>

      {/* --- 하단 말풍선 --- */}
      <BubbleBasic>
        {!showExitAnimation
          ? `${oldPos}번 위치에서 토관 속으로!\n어디로 연결되어 있을까?`
          : `자~ 한번 나와보겠습니다!\n여기는 ${newPos}번 위치네!`}
      </BubbleBasic>
    </div>
  );
};

export default Pipe;
