import React from 'react';
import { useNavigate } from 'react-router-dom';
import { COLORS } from '../../constants/colors';

/**
 * 홈 버튼 컴포넌트
 * - 좌측 상단에 고정 배치
 * - TopButtons 아이콘과 동일한 스타일 (creamIvory 배경, coffeeBrown 아이콘)
 *
 * @param {Function} onClick - 클릭 핸들러 (기본: /home으로 이동)
 * @param {boolean} showShadow - 그림자 표시 여부 (기본: true)
 * @param {string} iconColor - 아이콘 색상 (기본: coffeeBrown)
 * @param {string} bgColor - 배경 색상 (기본: creamIvory)
 * @param {string} className - 추가 클래스
 */
export default function HomeButton({
  onClick,
  showShadow = true,
  iconColor = COLORS.ac.coffeeBrown,
  bgColor = COLORS.ac.creamWhite,
  className = '',
}) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate('/home');
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`w-[4.17cqw] h-[4.17cqw] rounded-full flex items-center justify-center hover:scale-105 transition-transform cursor-pointer ${
        showShadow ? 'shadow-[0_0.37cqh_0.37cqh_rgba(0,0,0,0.1)]' : ''
      } ${className}`}
      style={{ backgroundColor: bgColor }}
    >
      <div
        className="w-[2.08cqw] h-[2.08cqw]"
        style={{
          backgroundColor: iconColor,
          maskImage: 'url("/images/icon-home.svg")',
          WebkitMaskImage: 'url("/images/icon-home.svg")',
          maskSize: 'contain',
          WebkitMaskSize: 'contain',
          maskRepeat: 'no-repeat',
          WebkitMaskRepeat: 'no-repeat',
          maskPosition: 'center',
          WebkitMaskPosition: 'center',
        }}
      />
    </button>
  );
}
