import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ExitButton from '../components/common/ExitButton';
import TopButtons from '../components/common/TopButtons';
import { HomeIcon } from '@heroicons/react/24/solid';

export default function Config() {
  const navigate = useNavigate();

  // BGM Volume State
  const [bgVolume, setBgVolume] = useState(() => {
    const saved = localStorage.getItem('bgVolume');
    return saved !== null ? parseFloat(saved) : 0.4;
  });

  // SFX Volume State (Mock for now, or use localStorage)
  const [sfxVolume, setSfxVolume] = useState(0.5);

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setBgVolume(newVolume);
    localStorage.setItem('bgVolume', newVolume);
  };

  const handleSfxChange = (e) => {
    setSfxVolume(parseFloat(e.target.value));
  };

  return (
    <div
      className="relative w-full h-screen flex items-center justify-center overflow-hidden font-gosanja"
      style={{
        backgroundImage: "url('/images/setting/bg-setting.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* 2026 배경 패턴(세모 등) - CSS로 구현하려면 별도 작업 필요 */}

      {/* 1. 상단 아이콘 영역 */}
      {/* 홈 버튼 (좌측 상단) */}
      <div className="absolute top-[40px] left-[40px] z-50">
        <button
          onClick={() => navigate('/home')}
          className="w-[80px] h-[80px] bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform cursor-pointer border-[3px] border-white"
        >
          <HomeIcon className="w-10 h-10 text-[#594E36]" />
        </button>
      </div>

      {/* TopButtons (우측 상단) */}
      <div className="absolute top-[40px] right-[40px] z-50">
        <TopButtons
          nickname={sessionStorage.getItem('nickname') || '주민'}
          onProfileClick={() => navigate('/mypage')}
          onBellClick={() => navigate('/notifications')}
          onConfigClick={() => {}} // 이미 설정 페이지
          colors={{
            text: '#594E36',
            badgeBg: '#FDFBF6',
            badgeText: '#594E36',
          }}
        />
      </div>

      {/* 중앙 컨텐츠 영역 (타이틀 + 카드) */}
      <div className="flex flex-col items-center gap-8 relative z-10">
        {/* 타이틀 영역 (카드 밖으로 이동) */}
        <div className="flex flex-col items-center gap-[60px] w-[1346px]">
          <h1 className="text-[60px] font-black text-[#594E36] whitespace-nowrap">환경설정</h1>

          <div className="flex items-center w-full">
            {/* 시작점 (동그라미) */}
            <div className="w-4 h-4 rounded-full bg-[#594E36]" />
            {/* 점선 (Flex grow로 나머지 영역 채움) */}
            <div className="h-[4px] flex-1 border-b-[6px] border-[#594E36] border-dashed opacity-80" />
            {/* 끝점 (동그라미) */}
            <div className="w-4 h-4 rounded-full bg-[#594E36]" />
          </div>
        </div>

        {/* 2. 중앙 컨텐츠 카드 (1346 x 664, Radius 120px) */}
        <div className="relative w-[1346px] h-[664px] bg-[#E8F5E9] rounded-[120px] shadow-2xl flex flex-col items-center justify-center pt-[20px]">
          {/* 슬라이더 영역 */}
          <div className="flex flex-col gap-[60px] w-full items-center">
            {/* BGM Slider */}
            <div className="w-[1080px] flex flex-col gap-4">
              <div className="flex justify-between items-end px-4">
                <span className="text-[32px] font-black text-[#594E36]">배경음악 (BGM)</span>
                <span className="text-[32px] font-black text-[#594E36] opacity-50">{Math.round(bgVolume * 100)}%</span>
              </div>
              {/* Slider Track: White */}
              <div className="relative w-full h-[48px] bg-white rounded-[24px] flex items-center px-0 shadow-inner">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={bgVolume}
                  onChange={handleVolumeChange}
                  className="absolute w-full h-full opacity-0 cursor-pointer z-20 top-0 left-0"
                />
                {/* Filled Bar - White (Hidden effectively, or same as track) */}
                <div
                  className="h-full bg-white rounded-[24px] absolute top-0 left-0 pointer-events-none"
                  style={{ width: `${bgVolume * 100}%` }}
                />
                {/* Thumb Circle - Brown #594E36 */}
                <div
                  className="w-[48px] h-[48px] bg-[#594E36] rounded-full absolute top-0 pointer-events-none shadow-lg border-4 border-white"
                  style={{ left: `calc(${bgVolume * 100}% - 24px)` }}
                />
              </div>
            </div>

            {/* SFX Slider */}
            <div className="w-[1080px] flex flex-col gap-4">
              <div className="flex justify-between items-end px-4">
                <span className="text-[32px] font-black text-[#594E36]">효과음 (SFX)</span>
                <span className="text-[32px] font-black text-[#594E36] opacity-50">{Math.round(sfxVolume * 100)}%</span>
              </div>
              <div className="relative w-full h-[48px] bg-white rounded-[24px] flex items-center px-0 shadow-inner">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={sfxVolume}
                  onChange={handleSfxChange}
                  className="absolute w-full h-full opacity-0 cursor-pointer z-20 top-0 left-0"
                />
                <div
                  className="h-full bg-white rounded-[24px] absolute top-0 left-0 pointer-events-none"
                  style={{ width: `${sfxVolume * 100}%` }}
                />
                <div
                  className="w-[48px] h-[48px] bg-[#594E36] rounded-full absolute top-0 pointer-events-none shadow-lg border-4 border-white"
                  style={{ left: `calc(${sfxVolume * 100}% - 24px)` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. 하단 나가기 버튼 (우측 하단) */}
      <ExitButton onClick={() => navigate('/home')} className="absolute bottom-8 right-8" />
    </div>
  );
}
