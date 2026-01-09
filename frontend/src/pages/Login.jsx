import React from "react";
import { Link } from "react-router-dom";

export default function Login() {
  return (
    <div
      className="relative w-full h-screen bg-cover bg-center overflow-hidden flex items-center justify-center"
      style={{ backgroundImage: "url('/images/background.jpg')" }}
    >
      {/* 뒤로가기 또는 홈 버튼 (왼쪽 상단) */}
      <Link
        to="/"
        className="absolute top-6 left-6 bg-[#fdf6e3] border-[4px] border-[#8b5a2b] p-2 rounded-2xl shadow-md hover:scale-110 transition"
      >
        <span className="text-2xl text-[#8b5a2b]">🏠</span>
      </Link>

      {/* 메인 로그인 박스: 나무 판자 느낌 */}
      <div className="relative w-[450px] bg-[#fdf6e3] p-10 rounded-[50px] border-[8px] border-[#8b5a2b] shadow-[15px_15px_0px_rgba(139,90,43,0.15)] flex flex-col items-center">
        {/* 상단 로고 배너 */}
        <div className="absolute -top-10 bg-[#8b5a2b] px-10 py-3 rounded-[30px] border-[5px] border-white shadow-lg transform -rotate-2">
          <h1 className="text-3xl font-black text-white tracking-tight">
            지어봐요 마이홈
          </h1>
        </div>

        <div className="mt-8 w-full space-y-6">
          {/* 아이디 입력창 */}
          <div className="relative group">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">
              🍃
            </span>
            <input
              type="text"
              placeholder="아이디를 입력하세요"
              className="w-full bg-[#efe7d1] border-none rounded-3xl py-4 pl-12 pr-4 text-[#5d4037] font-bold placeholder-[#a67c52] focus:ring-4 ring-[#8b5a2b]/20 outline-none transition-all"
            />
          </div>

          {/* 비밀번호 입력창 */}
          <div className="relative group">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">
              🔑
            </span>
            <input
              type="password"
              placeholder="비밀번호를 입력하세요"
              className="w-full bg-[#efe7d1] border-none rounded-3xl py-4 pl-12 pr-4 text-[#5d4037] font-bold placeholder-[#a67c52] focus:ring-4 ring-[#8b5a2b]/20 outline-none transition-all"
            />
          </div>

          {/* 로그인 버튼 */}
          <button className="w-full bg-[#8b5a2b] hover:bg-[#6d4622] text-[#fdf6e3] py-5 rounded-[30px] text-2xl font-black shadow-lg transition-all active:scale-95">
            로그인
          </button>
        </div>

        {/* 하단 링크: 회원가입 및 찾기 */}
        <div className="mt-6 flex gap-6 text-[#8b5a2b] font-bold text-sm">
          <button className="hover:underline">회원가입</button>
          <span className="text-[#a67c52]">|</span>
          <button className="hover:underline">아이디/비밀번호 찾기</button>
        </div>

        {/* 구분선 */}
        <div className="w-full flex items-center gap-3 my-8">
          <div className="flex-1 h-[2px] bg-[#a67c52]/30"></div>
          <span className="text-[#a67c52] text-xs font-bold">간편 로그인</span>
          <div className="flex-1 h-[2px] bg-[#a67c52]/30"></div>
        </div>

        {/* OAuth 소셜 로그인 버튼 */}
        <div className="flex gap-5">
          {/* 구글 */}
          <button className="w-14 h-14 bg-white rounded-2xl border-[3px] border-[#efe7d1] shadow-md flex items-center justify-center hover:scale-110 transition active:translate-y-1">
            <span className="font-bold text-gray-600">G</span>
          </button>
          {/* 카카오 */}
          <button className="w-14 h-14 bg-[#FEE500] rounded-2xl border-[3px] border-[#FEE500] shadow-md flex items-center justify-center hover:scale-110 transition active:translate-y-1">
            <span className="font-bold text-[#3C1E1E]">K</span>
          </button>
          {/* 네이버 */}
          <button className="w-14 h-14 bg-[#03C75A] rounded-2xl border-[3px] border-[#03C75A] shadow-md flex items-center justify-center hover:scale-110 transition active:translate-y-1">
            <span className="font-bold text-white text-xs">N</span>
          </button>
        </div>
      </div>

      {/* 꾸미기용 캐릭터 데코레이션 (옵션) */}
      <div
        className="absolute bottom-10 left-10 w-32 h-32 bg-contain bg-no-repeat opacity-80"
        style={{ backgroundImage: "url('/images/isabelle.png')" }}
      ></div>
    </div>
  );
}
