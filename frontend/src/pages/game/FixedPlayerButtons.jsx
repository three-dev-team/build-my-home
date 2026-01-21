import React from "react";
import { motion } from "framer-motion";

const FixedPlayerButtons = ({ isMyTurn, onATMClick, onBuildClick }) => {
  return (
    <div className="fixed bottom-28 right-8 flex flex-col gap-4 z-50">
      {/* ATM 버튼 - 내 턴에만 활성화(표시는 항상) */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={onATMClick}
        className={`w-20 h-20 rounded-full shadow-lg border-4 flex items-center justify-center text-3xl
          ${
            isMyTurn
              ? "bg-[#2ecc71] border-white cursor-pointer"
              : "bg-gray-400 border-gray-300 cursor-not-allowed grayscale"
          }`}
      >
        💳
      </motion.button>

      {/* 집짓기(마을회관) 버튼 - 상시 활성화 */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={onBuildClick}
        className="w-20 h-20 bg-[#f1c40f] rounded-full shadow-lg border-4 border-white flex items-center justify-center text-3xl cursor-pointer"
      >
        🏠
      </motion.button>
    </div>
  );
};

export default FixedPlayerButtons;
