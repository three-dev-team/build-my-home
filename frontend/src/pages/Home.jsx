import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Cog6ToothIcon, BellIcon, UserIcon } from '@heroicons/react/24/solid';

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [nickname, setNickname] = useState('');
  const [showUI, setShowUI] = useState(true);
  const navigate = useNavigate();
  const audioRef = useRef(null);

  // --- (오디오 체크) ---
  useEffect(() => {
    let audioTimer;
    if (audioRef.current) {
      const savedVolume = localStorage.getItem('bgVolume');
      const initialVolume = savedVolume !== null ? parseFloat(savedVolume) : 0.4;
      audioRef.current.volume = initialVolume;
      const playAudio = () => {
        if (audioRef.current) {
          audioRef.current.play().catch(() => {
            console.log('자동 재생 차단됨: 사용자 상호작용 필요');
          });
        }
      };
      audioTimer = setTimeout(() => {
        playAudio();
      }, 1000);
      window.addEventListener('click', playAudio, { once: true });
    }
    return () => {
      if (audioTimer) clearTimeout(audioTimer);
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, []);

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    const savedNickname = sessionStorage.getItem('nickname');

    if (!token) {
      // navigate('/'); // 토큰 없어도 홈은 볼 수 있게? or 로그인 강제? 기존 로직: navigate('/')
      // 디자인 보기 위해 잠시 주석 처리 or isLoggedIn false로 유지
    }

    if (token) {
      setIsLoggedIn(true);
      setNickname(savedNickname || '주민');
    }
  }, [navigate]);

  const uiTransitionClass = `transition-all duration-1000 ease-out ${
    showUI ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
  }`;

  // 공통 아이콘 박스 스타일 (80x80, rounded-full)
  const iconBoxStyle =
    'w-[80px] h-[80px] bg-white rounded-full flex items-center justify-center shadow-[0_4px_4px_rgba(0,0,0,0.1)] hover:scale-105 transition-transform cursor-pointer';

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[url('/images/bg-home.png')] bg-cover bg-center font-sans">
      {/*<audio ref={audioRef} src="/sounds/home_bgm.mp3" loop />*/}

      {/* 1. 상단 좌측 로고 (위치/크기 조정) */}
      <header className={`absolute top-[20px] -left-[56px] z-10 ${uiTransitionClass}`}>
        <Link to="/home" className="inline-block hover:scale-105 transition-transform">
          <img src="/images/ui-logo.png" alt="지어봐요 마이홈 로고" className="w-[634px] drop-shadow-md" />
        </Link>
      </header>

      {/* 2. 상단 우측 메뉴 (프로필, 알림, 설정) */}
      <div className={`absolute top-[20px] right-[40px] z-20 flex gap-6 items-start ${uiTransitionClass}`}>
        {/* 프로필 (아이콘 + 닉네임) */}
        <Link to={isLoggedIn ? '/myPage' : '/login'} className="flex flex-col items-center gap-1 group">
          <div className={`${iconBoxStyle} overflow-hidden border-[3px] border-white`}>
            <UserIcon className="w-10 h-10 text-[#594E36]" />
          </div>
          {/* 닉네임 뱃지 (80x40, radius-20px) */}
          <div className="flex items-center justify-center min-w-[80px] h-[40px] bg-[#FDFBF6] rounded-[20px] shadow-sm px-3">
            <span className="text-[24px] font-black text-[#594E36] leading-none pb-1">
              {isLoggedIn ? nickname : '로그인'}
            </span>
          </div>
        </Link>

        {/* 알림 */}
        <Link to="/notifications" className="flex flex-col items-center gap-1 group">
          <div className={iconBoxStyle}>
            <BellIcon className="w-10 h-10 text-[#594E36]" />
          </div>
        </Link>

        {/* 설정 */}
        <button className="flex flex-col items-center gap-1 group">
          <div className={iconBoxStyle}>
            <Cog6ToothIcon className="w-10 h-10 text-[#594E36]" />
          </div>
        </button>
      </div>

      {/* 3. 우측 하단 게임 시작 버튼 (540*190) */}
      <div className={`absolute bottom-6 right-3 z-30 ${uiTransitionClass}`}>
        <Link to={isLoggedIn ? '/room-list' : '/login'} className="inline-block group">
          <img
            src="/images/btn-start.png"
            alt="게임 시작 버튼"
            className="w-[540px] h-[190px] object-contain hover:scale-105 active:scale-95 transition-transform drop-shadow-[0_8px_4px_rgba(0,0,0,0.3)]"
          />
        </Link>
      </div>
    </div>
  );
}
