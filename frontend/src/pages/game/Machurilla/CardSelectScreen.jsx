import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useExitHandler } from '../../../hooks/useExitHandler.js';
import { useGameTimer } from '../../../hooks/useGameTimer.js';

const CARDS = [
  { type: 'MONEY', emoji: '💰', name: '금전운', color: 'bg-yellow-600', glowColor: 'rgba(250, 204, 21, 0.6)' },
  { type: 'PROPERTY', emoji: '🏠', name: '재산운', color: 'bg-green-600', glowColor: 'rgba(74, 222, 128, 0.6)' },
  { type: 'HEALTH', emoji: '🍎', name: '건강운', color: 'bg-red-600', glowColor: 'rgba(248, 113, 113, 0.6)' },
  { type: 'FRIENDSHIP', emoji: '🤝', name: '우정운', color: 'bg-blue-600', glowColor: 'rgba(96, 165, 250, 0.6)' },
];

const CardSelectScreen = ({ result, currentPlayerName, onNext, isMyTurn }) => {
  const selectedCard = result?.split('_')[0];
  const [isRevealed, setIsRevealed] = useState(false);
  const handleNext = useExitHandler(isMyTurn, onNext);

  // 1.2초 후 빛 효과
  useGameTimer(1.2, () => setIsRevealed(true));

  // 4.5초 후 다음 화면
  useGameTimer(4.5, handleNext);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 flex items-center justify-center bg-purple-950/80 backdrop-blur-sm z-[100]"
    >
      <div className="text-center w-full max-w-5xl px-8">
        <h2 className="text-3xl font-bold mb-12 text-white/90 tracking-widest">
          {isRevealed
            ? `아아- ${currentPlayerName}을 원하는 카드가 보이고 있어요`
            : `나쁜 운세여 물러가라!... 물러가라!...`}
        </h2>

        <div className="grid grid-cols-4 gap-8">
          {CARDS.map((card) => {
            const isSelected = card.type === selectedCard;

            return (
              <div key={card.type} className="relative">
                {/* --- 카드 뒤쪽에서 번져나오는 부드러운 후광 --- */}
                {isSelected && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={
                      isRevealed
                        ? {
                            opacity: [0, 0.8, 0.5],
                            scale: [0.9, 1.3, 1.2],
                            filter: ['blur(20px)', 'blur(50px)', 'blur(40px)'],
                          }
                        : {}
                    }
                    transition={{ duration: 2.5, ease: 'easeOut' }}
                    style={{ backgroundColor: card.glowColor }}
                    className="absolute inset-0 rounded-full"
                  />
                )}

                <motion.div
                  // 핵심: 다른 카드는 그대로(opacity 1), 선택된 카드만 효과 부여
                  animate={
                    isRevealed && isSelected
                      ? {
                          scale: 1.05,
                          boxShadow: `0 0 40px ${card.glowColor}`,
                          filter: 'brightness(1.2) contrast(1.1)',
                        }
                      : {
                          scale: 1,
                          boxShadow: '0 10px 20px rgba(0,0,0,0.3)',
                          filter: 'brightness(1) contrast(1)',
                        }
                  }
                  transition={{ duration: 2, ease: 'easeInOut' }}
                  className={`${card.color} relative h-72 rounded-2xl p-6 border-2 border-white/20 flex flex-col items-center justify-center overflow-hidden shadow-2xl`}
                >
                  {/* 선택된 카드 내부에 흐르는 빛 효과 */}
                  {isSelected && isRevealed && (
                    <motion.div
                      initial={{ left: '-150%' }}
                      animate={{ left: '150%' }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 0.5 }}
                      className="absolute top-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
                    />
                  )}

                  <div className="text-7xl mb-4 drop-shadow-md">{card.emoji}</div>
                  <div className="text-xl font-bold text-white tracking-tight">{card.name}</div>
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

export default CardSelectScreen;
