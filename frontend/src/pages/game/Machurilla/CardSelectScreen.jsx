import React from 'react';
import { motion } from 'framer-motion';

const CARDS = [
  { type: 'MONEY', emoji: '💰', name: '금전운', color: 'bg-yellow-600' },
  { type: 'PROPERTY', emoji: '🏠', name: '재산운', color: 'bg-green-600' },
  { type: 'HEALTH', emoji: '🍎', name: '건강운', color: 'bg-red-600' },
  { type: 'FRIENDSHIP', emoji: '🤝', name: '우정운', color: 'bg-blue-600' },
];

const CardSelectScreen = ({ onSelect, isMyTurn }) => {
  // 부모 컨테이너 애니메이션 설정 (자식들에게 순차적 효과 전달)
  const containerVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        when: 'beforeChildren', // 부모가 먼저 나타난 뒤
        staggerChildren: 0.15, // 자식들이 0.15초 간격으로 등장
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30, rotateY: 90 }, // 처음에 옆으로 누워있음
    visible: {
      opacity: 1,
      y: 0,
      rotateY: 0,
      transition: { type: 'spring', stiffness: 200, damping: 15 },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="bg-purple-900/90 rounded-[3rem] p-12 w-full max-w-5xl text-center shadow-[0_0_60px_rgba(168,85,247,0.6)] border-4 border-yellow-500/50 backdrop-blur-md"
    >
      <h2 className="text-4xl font-bold mb-2 text-yellow-300 drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
        🔮 운명의 카드
      </h2>
      <p className="text-purple-200 mb-10 italic text-lg">"당신의 미래가 이 안에 담겨 있습니다..."</p>

      {/* grid-cols-4로 변경하여 일렬 배치 */}
      <div className="grid grid-cols-4 gap-4 px-4">
        {CARDS.map((card) => (
          <motion.button
            key={card.type}
            variants={cardVariants}
            whileHover={
              isMyTurn
                ? {
                    scale: 1.05,
                    y: -15,
                    boxShadow: '0px 15px 30px rgba(0,0,0,0.4)',
                  }
                : {}
            }
            whileTap={isMyTurn ? { scale: 0.95 } : {}}
            onClick={() => onSelect(card.type)}
            disabled={!isMyTurn}
            className={`${card.color} relative h-64 hover:brightness-125 disabled:opacity-40 rounded-2xl p-4 transition-all border-2 border-white/30 flex flex-col items-center justify-center overflow-hidden group`}
          >
            {/* 카드 배경 빛 반사 효과 */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />

            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
              className="text-6xl mb-4 drop-shadow-lg"
            >
              {card.emoji}
            </motion.div>
            <div className="text-xl font-black text-white tracking-tighter drop-shadow-md">{card.name}</div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
};

export default CardSelectScreen;
