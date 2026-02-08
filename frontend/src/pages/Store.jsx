import React, { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Store() {
  const [tickets, setTickets] = useState(100);

  return (
    <div
      className="relative w-full h-screen bg-cover bg-center font-sans overflow-hidden"
      // style={{ backgroundImage: "url('/images/image_6.png')" }}
    >
      {/* 1. 상단 좌측: 게임 로고 */}
      <header className="absolute top-8 left-8 z-10">
        <Link to="/home" className="inline-block transform hover:scale-105 transition-transform">
          <div className="bg-[#8b5a2b] px-10 py-4 rounded-[35px] border-[6px] border-[#fdf6e3] shadow-[0_8px_0_rgba(0,0,0,0.2)]">
            <h1 className="text-4xl font-black text-[#fdf6e3] tracking-tighter">지어봐요 마이홈</h1>
          </div>
        </Link>
      </header>

      {/* 로고2 */}
      {/*<header className="absolute top-6 left-8 z-50">*/}
      {/*    <Link to="/" className="block group">*/}
      {/*        <div className="relative">*/}
      {/*<span className="block text-2xl font-black text-[#8b5a2b] tracking-tighter -mb-2 ml-2 drop-shadow-sm">*/}
      {/*  지어봐요*/}
      {/*</span>*/}
      {/*            <div className="bg-[#f7d31c] px-6 py-1 rounded-2xl border-[4px] border-[#8b5a2b] shadow-[3px_3px_0px_#6d4622] transform -rotate-2 group-hover:scale-105 transition-transform">*/}
      {/*                <h1 className="text-4xl font-black text-[#5d4037] tracking-tight">*/}
      {/*                    마이홈*/}
      {/*                </h1>*/}
      {/*            </div>*/}
      {/*            <span className="absolute -top-3 -right-2 text-3xl drop-shadow-md rotate-12">*/}
      {/*  🍃*/}
      {/*</span>*/}
      {/*        </div>*/}
      {/*    </Link>*/}
      {/*</header>*/}

      {/* 2. 우상단 재화 표시 영역 */}
      <div className="absolute top-6 right-8 flex gap-4 z-50">
        <div className="bg-[#fdf6e3] px-5 py-2 rounded-full border-[3px] border-[#8b5a2b] flex items-center gap-2 shadow-md">
          {' '}
          <div className="w-8 h-8 flex items-center justify-center bg-[#70a1ff] rounded-md rotate-[-10deg] shadow-sm">
            <span className="text-white text-xs">🎫</span>
          </div>
          <span className="text-2xl font-black text-[#5d4037]">{tickets} Nook Miles</span>
        </div>
      </div>

      {/* 3. 하단 뽑기 버튼 영역 */}
      <div className="absolute bottom-[12%] left-1/2 -translate-x-1/2 flex gap-12 w-full justify-center z-50">
        {/*    /!* 1회 뽑기 버튼 *!/*/}
        {/*    <button className="relative w-[340px] group active:translate-y-1 transition-all">*/}
        {/*        <div className="absolute inset-0 bg-[#8b5a2b] rounded-[45px] translate-y-2"></div>*/}
        {/*        <div className="relative bg-[#d4a373] w-full h-full rounded-[45px] border-[6px] border-[#8b5a2b] flex flex-col items-center justify-center py-5 group-hover:bg-[#c79668] transition-colors">*/}
        {/*<span className="text-4xl font-black text-white tracking-tight drop-shadow-sm">*/}
        {/*  1회 뽑기*/}
        {/*</span>*/}
        {/*            <div className="mt-1 flex items-center gap-2">*/}
        {/*                <span className="text-2xl">💰</span>*/}
        {/*                <span className="text-3xl font-black text-[#5d4037]">500 Bells</span>*/}
        {/*            </div>*/}
        {/*        </div>*/}
        {/*    </button>*/}

        <button className="relative min-w-[340px] w-max h-[140px] group active:translate-y-1 transition-all">
          {/* 하단 입체감 (그림자) */}
          <div className="absolute inset-0 bg-[#8b5a2b] rounded-full translate-y-3"></div>

          {/* 버튼 본체 */}
          <div className="relative bg-[#bc8a5f] w-full h-full rounded-full border-[6px] border-[#8b5a2b] flex flex-col items-center justify-center px-10 group-hover:bg-[#a8794f] transition-colors">
            {/* 메인 텍스트: 1회 뽑기 */}
            <span className="text-[42px] font-[900] text-white tracking-tight leading-none drop-shadow-[0_3px_0_rgba(139,90,43,0.8)] whitespace-nowrap">
              1회 뽑기
            </span>

            {/* 하단 가격 영역 (벨 아이콘) */}
            <div className="mt-2 flex items-center gap-2 bg-[#fdf2d9]/20 px-4 py-1 rounded-full whitespace-nowrap">
              {/* 벨(코인) 아이콘 */}
              <div className="w-8 h-8 flex items-center justify-center bg-[#ffd700] rounded-full border-2 border-[#b8860b] shadow-sm">
                <span className="text-[#b8860b] text-xs font-bold"></span>
              </div>

              {/* 가격 텍스트 */}
              <span className="text-2xl font-black text-[#5d4037]">
                500 <span className="text-xl">Bells</span>
              </span>
            </div>
          </div>
        </button>

        {/*    /!* 10회 뽑기 버튼 *!/*/}
        {/*    <button className="relative w-[340px] group active:translate-y-1 transition-all">*/}
        {/*        <div className="absolute inset-0 bg-[#8b5a2b] rounded-[45px] translate-y-2"></div>*/}
        {/*        <div className="relative bg-[#bc8a5f] w-full h-full rounded-[45px] border-[6px] border-[#8b5a2b] flex flex-col items-center justify-center py-5 group-hover:bg-[#a8794f] transition-colors">*/}
        {/*<span className="text-4xl font-black text-white tracking-tight drop-shadow-sm">*/}
        {/*  10회 뽑기*/}
        {/*</span>*/}
        {/*            <div className="mt-1 flex items-center gap-2">*/}
        {/*                <span className="text-2xl">🎫</span>*/}
        {/*                <span className="text-3xl font-black text-[#5d4037]">1,000 Nook Miles</span>*/}
        {/*            </div>*/}
        {/*        </div>*/}
        {/*    </button>*/}

        <button className="relative min-w-[340px] w-max h-[140px] group active:translate-y-1 transition-all">
          {/* 하단 입체감 */}
          <div className="absolute inset-0 bg-[#8b5a2b] rounded-full translate-y-3"></div>

          {/* 버튼 본체 */}
          <div className="relative bg-[#bc8a5f] w-full h-full rounded-full border-[6px] border-[#8b5a2b] flex flex-col items-center justify-center px-10 group-hover:bg-[#a8794f] transition-colors">
            {/* 1. whitespace-nowrap 추가: 절대 줄바꿈 되지 않음 */}
            <span className="text-[42px] font-[900] text-white tracking-tight leading-none drop-shadow-[0_3px_0_rgba(139,90,43,0.8)] whitespace-nowrap">
              10회 뽑기
            </span>

            {/* 2. 가격 영역도 줄바꿈 방지 */}
            <div className="mt-2 flex items-center gap-2 bg-[#fdf2d9]/20 px-4 py-1 rounded-full whitespace-nowrap">
              <div className="w-8 h-8 flex items-center justify-center bg-[#70a1ff] rounded-md rotate-[-10deg] shadow-sm">
                <span className="text-white text-xs">🎫</span>
              </div>

              <span className="text-2xl font-black text-[#5d4037]">
                1,000 <span className="text-xl">Nook Miles</span>
              </span>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
