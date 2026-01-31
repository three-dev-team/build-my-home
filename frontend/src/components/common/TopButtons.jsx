import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cog6ToothIcon, BellIcon, UserIcon } from '@heroicons/react/24/solid';

/**
 * 상단 우측 버튼 그룹 (프로필, 알림, 설정)
 * Home 페이지와 RoomList 페이지에서 공통으로 사용하며, 색상 테마를 props로 받습니다.
 *
 * @param {string} nickname - 사용자 닉네임
 * @param {Function} onProfileClick - 프로필 클릭 핸들러
 * @param {Function} onBellClick - 알림 클릭 핸들러
 * @param {Function} onConfigClick - 설정 클릭 핸들러 (드롭다운 내 '환경설정' 선택 시 실행)
 * @param {object} colors - 색상 설정 객체
 * @param {string} colors.text - 아이콘 및 닉네임 텍스트 색상
 * @param {string} colors.badgeBg - 닉네임 뱃지 배경 색상
 * @param {string} colors.badgeText - 닉네임 뱃지 텍스트 색상 (없으면 colors.text 사용)
 * @param {string} colors.dropdownBorder - 드롭다운 테두리 색상 (기본값: #EAD7B8)
 * @param {string} colors.dropdownHoverBg - 드롭다운 호버 배경 색상 (기본값: #FFF8EA)
 * @param {string} colors.dropdownText - 드롭다운 텍스트 색상 (기본값: #594E36)
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
    dropdownBorder: '#EAD7B8',
    dropdownHoverBg: '#FFF8EA',
    dropdownText: '#594E36',
  },
  showShadow = true,
  className = '',
}) => {
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // 기본값 설정 (colors prop에 일부만 들어올 경우 대비)
  const dropdownBorder = colors.dropdownBorder || '#EAD7B8';
  const dropdownHoverBg = colors.dropdownHoverBg || '#FFF8EA';
  const dropdownText = colors.dropdownText || '#594E36';

  // 80px = 4.17vw, 4px = 0.37vh shadow, 3px = 0.16vw border
  const iconBoxStyle = `w-[4.17vw] h-[4.17vw] bg-white rounded-full flex items-center justify-center ${showShadow ? 'shadow-[0_0.37vh_0.37vh_rgba(0,0,0,0.1)]' : ''} hover:scale-105 transition-transform cursor-pointer border-[0.16vw] border-white relative z-20`;

  const handleLogout = () => {
    // 로그아웃 로직
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('nickname');
    navigate('/login');
  };

  const handleInquiry = () => {
    navigate('/user-inquiry'); // 문의 페이지로 이동
    setIsDropdownOpen(false);
  };

  const handleConfigSelect = () => {
    if (onConfigClick) onConfigClick();
    setIsDropdownOpen(false);
  };

  return (
    // gap-6 = 24px = 1.25vw
    <div className={`flex gap-[1.25vw] items-start ${className}`}>
      {/* 프로필 (아이콘 + 닉네임) - gap-1 = 4px = 0.37vh */}
      <button onClick={onProfileClick} className="flex flex-col items-center gap-[0.37vh] group relative z-20">
        <div className={`${iconBoxStyle} overflow-hidden p-0`}>
          {/* w-10 h-10 = 40px = 2.08vw */}
          <UserIcon className="w-[2.08vw] h-[2.08vw]" style={{ color: colors.text }} />
        </div>
        {/* 닉네임 뱃지 - 80px = 4.17vw, 40px = 3.7vh, 20px = 1.04vw radius, px-3 = 12px = 0.63vw */}
        <div
          className="flex items-center justify-center min-w-[4.17vw] h-[3.7vh] rounded-[1.04vw] shadow-sm px-[0.63vw]"
          style={{ backgroundColor: colors.badgeBg }}
        >
          {/* 24px = 1.25vw text, pb-1 = 4px = 0.37vh */}
          <span
            className="text-[1.25vw] font-black leading-none pb-[0.37vh]"
            style={{ color: colors.badgeText || colors.text }}
          >
            {nickname}
          </span>
        </div>
      </button>

      {/* 알림 */}
      <button onClick={onBellClick} className={`${iconBoxStyle} relative z-20`}>
        <BellIcon className="w-[2.08vw] h-[2.08vw]" style={{ color: colors.text }} />
      </button>

      {/* 설정 (드롭다운 트리거) */}
      <div className="relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={`${iconBoxStyle} ${isDropdownOpen ? 'bg-gray-100' : ''}`}
        >
          <Cog6ToothIcon className="w-[2.08vw] h-[2.08vw]" style={{ color: colors.text }} />
        </button>

        {/* 드롭다운 메뉴 */}
        {isDropdownOpen && (
          <div
            className="absolute top-[5.21vw] right-0 w-[10.42vw] bg-white rounded-[1.04vw] shadow-lg border-[0.16vw] overflow-hidden flex flex-col z-30 animate-fade-in-up"
            style={{ borderColor: dropdownBorder }}
          >
            <button
              onClick={handleConfigSelect}
              className="w-full py-[0.83vw] font-bold text-[1.04vw] transition-colors border-b-[0.05vw]"
              style={{
                color: dropdownText,
                borderColor: dropdownBorder,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = dropdownHoverBg)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              환경설정
            </button>
            <button
              onClick={handleInquiry}
              className="w-full py-[0.83vw] font-bold text-[1.04vw] transition-colors border-b-[0.05vw]"
              style={{
                color: dropdownText,
                borderColor: dropdownBorder,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = dropdownHoverBg)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              문의하기
            </button>
            <button
              onClick={handleLogout}
              className="w-full py-[0.83vw] hover:bg-[#FFF0F0] text-[#EB5757] font-bold text-[1.04vw] transition-colors"
            >
              로그아웃
            </button>
          </div>
        )}
      </div>

      {/* 드롭다운 닫기용 백그라운드 클릭 감지 (투명 오버레이) */}
      {isDropdownOpen && <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />}
    </div>
  );
};

export default TopButtons;
