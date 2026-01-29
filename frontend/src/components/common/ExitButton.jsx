import React from 'react';

/**
 * 공통 나가기 버튼 컴포넌트
 *
 * @param {Function} onClick - 클릭 핸들러
 * @param {string} className - 추가 스타일 클래스 (위치 잡기용 등)
 * @param {string} label - 버튼 텍스트 (기본값: "나가기")
 * @param {boolean} disabled - 비활성화 여부
 */
const ExitButton = ({ onClick, className = '', label = '나가기', disabled = false }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        bg-[#FFFBF0] w-[205px] h-[62px] rounded-[31px] shadow-sm 
        flex items-center justify-center gap-[20px]
        transition-all hover:scale-105 active:scale-95 hover:brightness-105
        border-none
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      {/* 
        아이콘: 40px
      */}
      <img src="/images/room/icon-arrow-back.svg" alt="back" className="w-[60px] h-[60px]" />

      {/* 텍스트: 32px */}
      <span className="text-[#6B5B45] text-[32px] font-black leading-none pb-1">{label}</span>
    </button>
  );
};

export default ExitButton;
