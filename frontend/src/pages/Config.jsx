import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ExitButton from '../components/common/ExitButton';
import TopButtons from '../components/common/TopButtons';
import AspectLayout from '../components/layout/AspectLayout';

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
    <AspectLayout>
      <div className="relative w-full h-full bg-cover bg-center flex flex-col items-center justify-center overflow-hidden font-gosanja bg-[url('/images/setting/bg-setting.jpg')]">
        {/* TopButtons (우측 상단) 
            - Top: 3.7cqh
            - Right: 2.08cqw
        */}
        <div className="absolute top-[3.7cqh] right-[2.08cqw] z-50">
          <TopButtons
            nickname={sessionStorage.getItem('nickname') || '주민'}
            onProfileClick={() => navigate('/mypage')}
            onBellClick={() => navigate('/notifications')}
            onConfigClick={() => {}} // 이미 설정 페이지
            showShadow={false}
            colors={{
              text: '#594E36',
              badgeBg: '#FDFBF6',
              badgeText: '#594E36',
            }}
          />
        </div>

        {/* 홈 버튼 (좌측 상단) - Top/Left 2.08cqw */}
        <div className="absolute top-[2.08cqw] left-[2.08cqw] z-50">
          <button
            onClick={() => navigate('/home')}
            className="w-[4.17cqw] h-[4.17cqw] bg-white rounded-full flex items-center justify-center hover:scale-105 transition-transform cursor-pointer border-[0.16cqw] border-white"
          >
            <div
              className="w-[2.08cqw] h-[2.08cqw] bg-[#594E36]"
              style={{
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
        </div>

        {/* Main Content Group */}
        <div className="flex flex-col items-center gap-[1.67cqw] relative z-10 w-full mb-[2cqw]">
          {/* 타이틀 영역 (카드 밖으로 이동) */}
          <div className="flex flex-col items-center gap-[0.88cqw] w-[40cqw]">
            <h1 className="text-[4.17cqw] font-black text-[#594E36] whitespace-nowrap">환경설정</h1>

            {/* Divider */}
            <div className="flex items-center w-full gap-[0.52cqw]">
              <div className="w-[0.63cqw] h-[0.63cqw] rounded-full bg-[#594E36]" />
              <div className="h-[0.09cqw] flex-1 border-b-[0.3cqw] border-[#594E36] border-dashed opacity-80" />
              <div className="w-[0.63cqw] h-[0.63cqw] rounded-full bg-[#594E36]" />
            </div>
          </div>

          {/* 2. 중앙 컨텐츠 카드 */}
          <div className="relative w-[70.1cqw] h-[34.58cqw] bg-[#E8F5E9] rounded-[6.25cqw] flex flex-col items-center justify-center pt-[1.04cqw]">
            {/* 슬라이더 영역 */}
            <div className="flex flex-col gap-[3.13cqw] w-full items-center">
              {/* BGM Slider */}
              <div className="w-[56.25cqw] flex flex-col gap-[0.83cqw]">
                <div className="flex justify-between items-end px-[0.83cqw]">
                  <span className="text-[1.67cqw] font-black text-[#594E36]">배경음악 (BGM)</span>
                  <span className="text-[1.67cqw] font-black text-[#594E36] opacity-50">
                    {Math.round(bgVolume * 100)}%
                  </span>
                </div>
                <div className="relative w-full h-[2.5cqw] bg-white rounded-[1.25cqw] flex items-center px-0">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={bgVolume}
                    onChange={handleVolumeChange}
                    className="absolute w-full h-full opacity-0 cursor-pointer z-20 top-0 left-0"
                  />
                  {/* Filled Bar */}
                  <div
                    className="h-full bg-white rounded-[1.25cqw] absolute top-0 left-0 pointer-events-none"
                    style={{ width: `${bgVolume * 100}%` }}
                  />
                  {/* Thumb Circle */}
                  <div
                    className="w-[2.5cqw] h-[2.5cqw] bg-[#594E36] rounded-full absolute top-0 pointer-events-none border-[0.21cqw] border-white"
                    style={{ left: `calc(${bgVolume * 100}% - 1.25cqw)` }}
                  />
                </div>
              </div>

              {/* SFX Slider */}
              <div className="w-[56.25cqw] flex flex-col gap-[0.83cqw]">
                <div className="flex justify-between items-end px-[0.83cqw]">
                  <span className="text-[1.67cqw] font-black text-[#594E36]">효과음 (SFX)</span>
                  <span className="text-[1.67cqw] font-black text-[#594E36] opacity-50">
                    {Math.round(sfxVolume * 100)}%
                  </span>
                </div>
                <div className="relative w-full h-[2.5cqw] bg-white rounded-[1.25cqw] flex items-center px-0">
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
                    className="h-full bg-white rounded-[1.25cqw] absolute top-0 left-0 pointer-events-none"
                    style={{ width: `${sfxVolume * 100}%` }}
                  />
                  <div
                    className="w-[2.5cqw] h-[2.5cqw] bg-[#594E36] rounded-full absolute top-0 pointer-events-none border-[0.21cqw] border-white"
                    style={{ left: `calc(${sfxVolume * 100}% - 1.25cqw)` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. 하단 나가기 버튼 (우측 하단) 
            - Bottom: 32px -> 1.67cqw
            - Right: 32px -> 1.67cqw
        */}
        <div className="absolute bottom-[1.67cqw] right-[1.67cqw]">
          <ExitButton onClick={() => navigate('/home')} showShadow={false} />
        </div>
      </div>
    </AspectLayout>
  );
}
