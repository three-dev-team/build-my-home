import React from 'react';
import { motion } from 'framer-motion';

const BubbleBasic = ({ children, onClick, showArrow = false }) => {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="absolute bottom-12 left-0 right-0 px-4 flex justify-center z-50 cursor-pointer"
      onClick={onClick}
    >
      <div
        className="relative bg-[#FFFEE9] rounded-[45px] p-8 text-center shadow-xl w-full max-w-2xl border-4 border-white/50"
        style={{
          color: '#594E36',
          boxShadow: '0 10px 0 rgba(0,0,0,0.1)',
        }}
      >
        {/* children으로 변경하여 JSX, 버튼 등 자유롭게 삽입 가능 */}
        <div className="text-2xl md:text-3xl font-medium leading-relaxed whitespace-pre-wrap">{children}</div>

        {/* 꼬리 (SVG) */}
        <div className="absolute left-1/2 bottom-[-18px] transform -translate-x-1/2 text-[#FFFEE9] drop-shadow-md">
          <svg width="40" height="20" viewBox="0 0 40 20" fill="currentColor">
            <path d="M0 0 H40 L20 20 Z" />
          </svg>
        </div>

        {/* 진행 화살표 */}
        {showArrow && <div className="absolute right-8 bottom-6 text-[#E76C21] animate-bounce text-2xl">▼</div>}
      </div>
    </motion.div>
  );
};

export default BubbleBasic;
