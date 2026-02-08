import React, { useState } from 'react';
import axios from 'axios';
import { createPortal } from 'react-dom';
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
  profileImage = null,
  onProfileClick,
  onBellClick,
  onConfigClick,
  onNavigate,
  colors = {
    text: '#7B6C53', // coffeeBrown
    iconBg: '#FDFBF6', // creamWhite
    badgeBg: '#7B6C53', // coffeeBrown (swap)
    badgeText: '#FFFEE0', // creamIvory
    dropdownBorder: '#EAD7B8',
    dropdownHoverBg: '#FFF8EA',
    dropdownText: '#594E36',
  },
  showShadow = true,
  className = '',
}) => {
  const routerNavigate = useNavigate();
  const nav = onNavigate || routerNavigate;
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // 기본값 설정 (colors prop에 일부만 들어올 경우 대비)
  const iconBg = colors.iconBg || '#FDFBF6';
  const dropdownBorder = colors.dropdownBorder || '#EAD7B8';
  const dropdownHoverBg = colors.dropdownHoverBg || '#FFF8EA';
  const dropdownText = colors.dropdownText || '#594E36';

  // 80px = 4.17cqw, 4px = 0.37cqh shadow
  const iconBoxStyle = `w-[4.17cqw] h-[4.17cqw] rounded-full flex items-center justify-center ${showShadow ? 'shadow-[0_0.37cqh_0.37cqh_rgba(0,0,0,0.1)]' : ''} hover:scale-105 transition-transform cursor-pointer relative z-20`;

  const handleLogout = async () => {
    // 서버에 로그아웃 알림 (isOnline = false)
    try {
      const token = sessionStorage.getItem('token');
      if (token) {
        await axios.post(
          '/api/member/logout',
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
      }
    } catch (error) {
      console.error('로그아웃 API 호출 실패:', error);
    }
    // 모든 세션 데이터 삭제
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('memberId');
    sessionStorage.removeItem('role');
    sessionStorage.removeItem('nickname');
    sessionStorage.removeItem('bell');
    sessionStorage.removeItem('level');
    sessionStorage.removeItem('profileImage');
    routerNavigate('/');
  };

  const handleInquiry = () => {
    nav('/user-inquiry'); // 문의 페이지로 이동
    setIsDropdownOpen(false);
  };

  const handleConfigSelect = () => {
    if (onConfigClick) onConfigClick();
    setIsDropdownOpen(false);
  };

  return (
    // gap-6 = 24px = 1.25cqw
    <div className={`flex gap-[1.25cqw] items-start ${className}`}>
      {/* 프로필 (아이콘 + 닉네임) - gap-1 = 4px = 0.37cqh */}
      <button onClick={onProfileClick} className="flex flex-col items-center gap-[0.37cqh] group relative z-20">
        <div
          className={`${iconBoxStyle} overflow-hidden p-0 border-[0.26cqw] border-white`}
          style={{ backgroundColor: iconBg }}
        >
          {profileImage ? (
            <img src={profileImage} alt="profile" className="w-full h-full object-cover" />
          ) : (
            <UserIcon className="w-[2.08cqw] h-[2.08cqw]" style={{ color: colors.text }} />
          )}
        </div>
        {/* 닉네임 뱃지 - hover 시에만 표시 */}
        <div
          className="flex items-center justify-center min-w-[4.17cqw] h-[3.7cqh] rounded-[1.04cqw] shadow-sm px-[0.63cqw] opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{ backgroundColor: colors.badgeBg }}
        >
          {/* 24px = 1.25cqw text */}
          <span
            className="text-[1.25cqw] font-black leading-none pt-[0.2cqh]"
            style={{ color: colors.badgeText || colors.text }}
          >
            {nickname}
          </span>
        </div>
      </button>

      {/* 알림 */}
      <button onClick={onBellClick} className={`${iconBoxStyle} relative z-20`} style={{ backgroundColor: iconBg }}>
        <BellIcon className="w-[2.08cqw] h-[2.08cqw]" style={{ color: colors.text }} />
      </button>

      {/* 설정 (드롭다운 트리거) */}
      <div className="relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={`${iconBoxStyle}`}
          style={{ backgroundColor: isDropdownOpen ? '#E5E5E5' : iconBg }}
        >
          <Cog6ToothIcon className="w-[2.08cqw] h-[2.08cqw]" style={{ color: colors.text }} />
        </button>

        {/* 드롭다운 메뉴 */}
        {isDropdownOpen && (
          <div
            className="absolute top-[5.21cqw] right-0 w-[10.42cqw] rounded-[1.04cqw] shadow-lg border-[0.16cqw] overflow-hidden flex flex-col z-30 animate-fade-in-up"
            style={{ backgroundColor: iconBg, borderColor: dropdownBorder }}
          >
            <button
              onClick={handleConfigSelect}
              className="w-full py-[0.83cqw] font-bold text-[1.04cqw] transition-colors border-b-[0.05cqw]"
              style={{
                color: '#7B6C53',
                borderColor: dropdownBorder,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = dropdownHoverBg)}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              환경설정
            </button>
            {sessionStorage.getItem('role') === 'ADMIN' ? (
              <button
                onClick={() => {
                  nav('/admin');
                  setIsDropdownOpen(false);
                }}
                className="w-full py-[0.83cqw] font-bold text-[1.04cqw] transition-colors border-b-[0.05cqw]"
                style={{
                  color: '#7B6C53',
                  borderColor: dropdownBorder,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = dropdownHoverBg)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                ADMIN
              </button>
            ) : (
              <button
                onClick={handleInquiry}
                className="w-full py-[0.83cqw] font-bold text-[1.04cqw] transition-colors border-b-[0.05cqw]"
                style={{
                  color: '#7B6C53',
                  borderColor: dropdownBorder,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = dropdownHoverBg)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                문의하기
              </button>
            )}
            <button
              onClick={() => {
                setIsDropdownOpen(false);
                setShowLogoutConfirm(true);
              }}
              className="w-full py-[0.83cqw] hover:bg-[#FFF0F0] text-[#EB5757] font-bold text-[1.04cqw] transition-colors"
            >
              로그아웃
            </button>
          </div>
        )}
      </div>

      {/* 드롭다운 닫기용 백그라운드 클릭 감지 (투명 오버레이) */}
      {isDropdownOpen && <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />}

      {/* 로그아웃 확인 모달 */}
      {showLogoutConfirm &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center backdrop-blur-sm"
            onClick={() => setShowLogoutConfirm(false)}
          >
            <div
              className="bg-[#FDFBF6] rounded-[20px] p-[40px] w-[400px] shadow-2xl flex flex-col items-center gap-[24px]"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-[18px] font-bold text-[#594E36] text-center">정말 로그아웃 하시겠습니까?</p>
              <div className="flex gap-[12px]">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="px-[28px] py-[12px] text-[14px] font-bold rounded-[12px] bg-[#E5E5E5] text-[#594E36] hover:scale-105 transition-transform"
                >
                  취소
                </button>
                <button
                  onClick={handleLogout}
                  className="px-[28px] py-[12px] text-[14px] font-bold rounded-[12px] bg-[#EB5757] text-white hover:scale-105 transition-transform"
                >
                  로그아웃
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default TopButtons;
