import React from 'react';

/**
 * 공통 나가기 버튼 컴포넌트
 *
 * @param {Function} onClick - 클릭 핸들러
 * @param {string} className - 추가 스타일 클래스 (위치 잡기용 등)
 * @param {string} label - 버튼 텍스트 (기본값: "나가기")
 * @param {boolean} disabled - 비활성화 여부
 */
const ExitButton = ({ onClick, className = '', label = '나가기', disabled = false, showShadow = true }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        bg-[#FFFBF0] w-[10.6cqw] h-[3.2cqw] rounded-[1.6cqw] ${showShadow ? 'shadow-sm' : ''} 
        flex items-center justify-center gap-[0.3cqw]
        transition-all hover:scale-105 active:scale-95 hover:brightness-105
        border-none
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      {/* 
        아이콘: 60px -> 3.1cqw
      */}
      <img src="/images/room/icon-arrow-back.svg" alt="back" className="w-[3.1cqw] h-[3.1cqw]" />

      {/* 텍스트: 32px -> 1.6cqw */}
      <span className="text-[#6B5B45] text-[1.6cqw] font-black leading-none pt-[0.5cqw]">{label}</span>
    </button>
  );
};

export default ExitButton;
