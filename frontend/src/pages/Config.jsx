import React from "react";
import { Link } from "react-router-dom";

export default function Config() {
  return (
    <div
      className="relative w-full h-screen bg-cover bg-center flex items-center justify-center overflow-hidden"
      style={{
        backgroundImage: "url('/images/background.jpg')",
      }}
    >
      {/* 뒤로가기 버튼 */}
      <Link
        to="/home"
        className="absolute top-8 left-8 bg-[#fdf6e3] border-[4px] border-[#8b5a2b] p-3 rounded-2xl shadow-[4px_4px_0px_#8b5a2b] hover:scale-110 transition z-50"
      >
        <span className="text-2xl">🏠</span>
      </Link>

      {/* 설정 보드 (메인 컨테이너) */}
      <div className="relative w-[650px] bg-[#fdf6e3] rounded-[60px] border-[12px] border-[#8b5a2b] shadow-[20px_20px_0px_rgba(0,0,0,0.1)] overflow-hidden">
        {/* 상단 타이틀 영역 */}
        <div className="pt-10 pb-6 px-16">
          <h1 className="text-6xl font-black text-[#5d4037] tracking-tighter opacity-80">
            CONFIG
          </h1>
        </div>

        {/* 중간 나무 선반/구분선 */}
        <div className="h-6 bg-[#8b5a2b] w-full border-y-4 border-[#6d4622] relative">
          {/* 장식용 도토리와 버섯 (이미지 대신 이모지로 재현) */}
          <span className="absolute -top-8 left-10 text-3xl">🌰</span>
          <span className="absolute -top-6 right-16 text-2xl">🍄</span>
        </div>

        {/* 설정 항목 리스트 */}
        <div className="p-12 space-y-8 text-[#5d4037]">
          {/* Key Config */}
          <div className="flex items-center text-3xl font-bold">
            <span className="w-48 text-[#a67c52]">key Config</span>
          </div>

          {/* Com Level */}
          <div className="flex items-center justify-between text-3xl font-bold">
            <span className="text-[#a67c52]">Com Level </span>
            <div className="relative w-64">
              <select className="w-full bg-[#d4a373] border-[4px] border-[#8b5a2b] rounded-2xl py-2 px-4 appearance-none text-[#fdf6e3] cursor-pointer outline-none shadow-md">
                <option>Very Easy</option>
                <option>Easy</option>
                <option>Normal</option>
              </select>
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl">
                🍃
              </span>
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#fdf6e3]">
                ▼
              </span>
            </div>
          </div>

          {/* Quality */}
          <div className="flex items-center justify-between text-3xl font-bold">
            <span className="text-[#a67c52]">Quality </span>
            <div className="relative w-64">
              <select className="w-full bg-[#d4a373] border-[4px] border-[#8b5a2b] rounded-2xl py-2 px-4 appearance-none text-[#fdf6e3] cursor-pointer outline-none shadow-md text-center">
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#fdf6e3]">
                ▼
              </span>
            </div>
          </div>

          {/* Voice Slider */}
          <div className="flex items-center justify-between text-3xl font-bold">
            <span className="text-[#a67c52]">Voice </span>
            <div className="flex items-center gap-4 w-64">
              <span className="text-2xl">🔊</span>
              <div className="relative w-full h-3 bg-[#8b5a2b]/30 rounded-full">
                <div className="absolute top-0 left-0 h-full bg-[#8b5a2b] rounded-full w-[70%]"></div>
                <div className="absolute top-1/2 left-[70%] -translate-x-1/2 -translate-y-1/2 text-2xl cursor-pointer">
                  🍃
                </div>
              </div>
            </div>
          </div>

          {/* bg Sound Slider */}
          <div className="flex items-center justify-between text-3xl font-bold">
            <span className="text-[#a67c52]">bg Sound </span>
            <div className="flex items-center gap-4 w-64">
              <span className="text-2xl">🎵</span>
              <div className="relative w-full h-3 bg-[#8b5a2b]/30 rounded-full">
                <div className="absolute top-0 left-0 h-full bg-[#8b5a2b] rounded-full w-[40%]"></div>
                <div className="absolute top-1/2 left-[40%] -translate-x-1/2 -translate-y-1/2 text-2xl cursor-pointer">
                  🍃
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 하단 모서리 장식 */}
        <span className="absolute bottom-4 left-6 text-4xl transform -rotate-12">
          🍄
        </span>
        <span className="absolute bottom-6 right-10 text-3xl opacity-80">
          🍂
        </span>
      </div>
    </div>
  );
}
