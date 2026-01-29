import React from 'react';
import { Cog6ToothIcon, BellIcon, UserIcon } from '@heroicons/react/24/solid';

/**
 * 상단 우측 버튼 그룹 (프로필, 알림, 설정)
 * Home 페이지와 RoomList 페이지에서 공통으로 사용하며, 색상 테마를 props로 받습니다.
 *
 * @param {string} nickname - 사용자 닉네임
 * @param {Function} onProfileClick - 프로필 클릭 핸들러
 * @param {Function} onBellClick - 알림 클릭 핸들러
 * @param {Function} onConfigClick - 설정 클릭 핸들러
 * @param {object} colors - 색상 설정 객체
 * @param {string} colors.text - 아이콘 및 닉네임 텍스트 색상
 * @param {string} colors.badgeBg - 닉네임 뱃지 배경 색상
 * @param {string} colors.badgeText - 닉네임 뱃지 텍스트 색상 (없으면 colors.text 사용)
 * @param {string} className - 컨테이너 스타일 클래스
 */
const TopButtons = ({
  nickname = '주민',
  onProfileClick,
  onBellClick,
  onConfigClick,
  colors = {
    text: '#594E36',
    badgeBg: '#FDFBF6',
    badgeText: '#594E36',
  },
  className = '',
}) => {
  const iconBoxStyle =
    'w-[80px] h-[80px] bg-white rounded-full flex items-center justify-center shadow-[0_4px_4px_rgba(0,0,0,0.1)] hover:scale-105 transition-transform cursor-pointer border-[3px] border-white';
  // RoomList는 모든 버튼에 border가 있었고, Home은 프로필에만 있었으나 일관성을 위해 border를 기본으로 둡니다.
  // 필요하다면 props로 제어할 수 있습니다.

  return (
    <div className={`flex gap-6 items-start ${className}`}>
      {/* 프로필 (아이콘 + 닉네임) */}
      <button onClick={onProfileClick} className="flex flex-col items-center gap-1 group">
        <div className={`${iconBoxStyle} overflow-hidden p-0`}>
          <UserIcon className="w-10 h-10" style={{ color: colors.text }} />
        </div>
        {/* 닉네임 뱃지 */}
        <div
          className="flex items-center justify-center min-w-[80px] h-[40px] rounded-[20px] shadow-sm px-3"
          style={{ backgroundColor: colors.badgeBg }}
        >
          <span className="text-[24px] font-black leading-none pb-1" style={{ color: colors.badgeText || colors.text }}>
            {nickname}
          </span>
        </div>
      </button>

      {/* 알림 */}
      <button onClick={onBellClick} className={iconBoxStyle}>
        <BellIcon className="w-10 h-10" style={{ color: colors.text }} />
      </button>

      {/* 설정 */}
      <button onClick={onConfigClick} className={iconBoxStyle}>
        <Cog6ToothIcon className="w-10 h-10" style={{ color: colors.text }} />
      </button>
    </div>
  );
};

export default TopButtons;
