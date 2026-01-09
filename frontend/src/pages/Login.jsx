import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
const GoogleIcon = () => (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g filter="url(#filter0_d_1_2)">
        <path d="M28 50C40.1503 50 50 40.1503 50 28C50 15.8497 40.1503 6 28 6C15.8497 6 6 15.8497 6 28C6 40.1503 15.8497 50 28 50Z" fill="#FFFCEF" stroke="#DED0A6" strokeWidth="3"/>
        <path d="M28 13C29.9 13 31.7 13.7 33 14.9L38.4 9.5C35.6 6.9 32 5.3 28 5.3C19.3 5.3 11.9 10.8 9.2 18.5L15.5 23.4C17.4 17.4 22.3 13 28 13Z" fill="#EA4335"/>
        <path d="M28 43C22.3 43 17.4 38.6 15.5 32.6L9.2 37.5C11.9 45.2 19.3 50.7 28 50.7C34.2 50.7 39.4 48.7 43.2 45.2L37.3 40.6C35.3 42 32.4 43 28 43Z" fill="#34A853"/>
        <path d="M15.5 32.6C15 31.1 14.7 29.6 14.7 28C14.7 26.4 15 24.9 15.5 23.4L9.2 18.5C8.1 21.4 7.5 24.6 7.5 28C7.5 31.4 8.1 34.6 9.2 37.5L15.5 32.6Z" fill="#FBBC05"/>
        <path d="M50 28C50 26.4 49.8 24.8 49.4 23.3H28V32H40.7C40.2 34.9 38.3 38.3 37.3 40.6L43.2 45.2C47 41.6 50 35.6 50 28Z" fill="#4285F4"/>
        <path d="M28 4C14.7452 4 4 14.7452 4 28C4 41.2548 14.7452 52 28 52C41.2548 52 52 41.2548 52 28C52 14.7452 41.2548 4 28 4ZM28 49.3333C16.2176 49.3333 6.66667 39.7824 6.66667 28C6.66667 16.2176 16.2176 6.66667 28 6.66667C39.7824 6.66667 49.3333 16.2176 49.3333 28C49.3333 39.7824 39.7824 49.3333 28 49.3333Z" fill="#9E8F5C" opacity="0.3"/>
      </g>
      <defs>
        <filter id="filter0_d_1_2" x="0" y="0" width="56" height="56" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix"/>
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
          <feOffset dy="2"/>
          <feGaussianBlur stdDeviation="1.5"/>
          <feComposite in2="hardAlpha" operator="out"/>
          <feColorMatrix type="matrix" values="0 0 0 0 0.619608 0 0 0 0 0.560784 0 0 0 0 0.360784 0 0 0 0.25 0"/>
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1_2"/>
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_1_2" result="shape"/>
        </filter>
      </defs>
    </svg>
);

const GithubIcon = () => (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g filter="url(#filter0_d_1_3)">
        <path d="M28 50C40.1503 50 50 40.1503 50 28C50 15.8497 40.1503 6 28 6C15.8497 6 6 15.8497 6 28C6 40.1503 15.8497 50 28 50Z" fill="#F4F0D7" stroke="#DED0A6" strokeWidth="3"/>
        <path fillRule="evenodd" clipRule="evenodd" d="M28 5.3C15.5 5.3 5.3 15.5 5.3 28C5.3 38 11.8 46.5 20.8 49.5C21.9 49.7 22.3 49 22.3 48.4C22.3 47.9 22.3 46.5 22.3 44.7C16 46 14.7 41.7 14.7 41.7C13.7 39.1 12.2 38.4 12.2 38.4C10.1 37 12.3 37 12.3 37C14.6 37.2 15.8 39.4 15.8 39.4C17.8 42.9 21.1 41.9 22.4 41.3C22.6 39.8 23.2 38.8 23.9 38.2C18.9 37.6 13.6 35.7 13.6 27.2C13.6 24.8 14.5 22.8 16 21.1C15.8 20.5 15 18.2 16.2 15.1C16.2 15.1 18.1 14.5 22.5 17.5C24.3 17 26.2 16.7 28 16.7C29.8 16.7 31.7 17 33.5 17.5C37.9 14.5 39.8 15.1 39.8 15.1C41 18.2 40.2 20.5 40 21.1C41.5 22.8 42.4 24.8 42.4 27.2C42.4 35.7 37.1 37.6 32.1 38.1C32.9 38.8 33.7 40.3 33.7 42.5C33.7 45.7 33.6 48.2 33.6 48.9C33.6 49.5 34 50.2 35.1 50C44.2 47 50.7 38.5 50.7 28.5C50.7 16 40.5 5.3 28 5.3Z" fill="#3C1E1E"/>
        <path d="M28 4C14.7452 4 4 14.7452 4 28C4 41.2548 14.7452 52 28 52C41.2548 52 52 41.2548 52 28C52 14.7452 41.2548 4 28 4ZM28 49.3333C16.2176 49.3333 6.66667 39.7824 6.66667 28C6.66667 16.2176 16.2176 6.66667 28 6.66667C39.7824 6.66667 49.3333 16.2176 49.3333 28C49.3333 39.7824 39.7824 49.3333 28 49.3333Z" fill="#9E8F5C" opacity="0.3"/>
      </g>
      <defs>
        <filter id="filter0_d_1_3" x="0" y="0" width="56" height="56" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix"/>
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
          <feOffset dy="2"/>
          <feGaussianBlur stdDeviation="1.5"/>
          <feComposite in2="hardAlpha" operator="out"/>
          <feColorMatrix type="matrix" values="0 0 0 0 0.619608 0 0 0 0 0.560784 0 0 0 0 0.360784 0 0 0 0.25 0"/>
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1_3"/>
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_1_3" result="shape"/>
        </filter>
      </defs>
    </svg>
);

const NaverIcon = () => (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g filter="url(#filter0_d_1_4)">
        <path d="M28 50C40.1503 50 50 40.1503 50 28C50 15.8497 40.1503 6 28 6C15.8497 6 6 15.8497 6 28C6 40.1503 15.8497 50 28 50Z" fill="#03C75A" stroke="#02A449" strokeWidth="3"/>
        <path d="M16.4 16H24.8L33.2 28.5V16H39.6V40H31.2L22.8 27.5V40H16.4V16Z" fill="white"/>
        <path d="M28 4C14.7452 4 4 14.7452 4 28C4 41.2548 14.7452 52 28 52C41.2548 52 52 41.2548 52 28C52 14.7452 41.2548 4 28 4ZM28 49.3333C16.2176 49.3333 6.66667 39.7824 6.66667 28C6.66667 16.2176 16.2176 6.66667 28 6.66667C39.7824 6.66667 49.3333 16.2176 49.3333 28C49.3333 39.7824 39.7824 49.3333 28 49.3333Z" fill="#02A449" opacity="0.3"/>
      </g>
      <defs>
        <filter id="filter0_d_1_4" x="0" y="0" width="56" height="56" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix"/>
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
          <feOffset dy="2"/>
          <feGaussianBlur stdDeviation="1.5"/>
          <feComposite in2="hardAlpha" operator="out"/>
          <feColorMatrix type="matrix" values="0 0 0 0 0.00784314 0 0 0 0 0.388235 0 0 0 0 0.176471 0 0 0 0.25 0"/>
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1_4"/>
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_1_4" result="shape"/>
        </filter>
      </defs>
    </svg>
);
export default function Login() {
  // 1. 상태 관리 (사용자 입력값 저장)
  const [memberId, setMemberId] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  // 2. 로그인
  const handleLogin = async () => {
    try {
      const response = await axios.post("http://localhost:8088/api/member/login", {
        email: memberId,
        password: password,
      });

      if (response.status === 200) {
        // 서버에서 보낸 nickname을 꺼냅니다.
        const { token, nickname, bell, level } = response.data;

        sessionStorage.setItem("token", token);
        sessionStorage.setItem("nickname", nickname);
        sessionStorage.setItem("bell", bell);
        sessionStorage.setItem("level", level);

        alert(`${nickname}님 환영합니다! 🍃`);
        navigate("/home");
      }
    } catch (error) {
      alert("로그인 정보를 확인해주세요.");
    }
  };

  const handleSocialLogin = (provider) => {
    // http://localhost:8088... 을 다 쓰지 말고 '상대 경로'만 적으세요.
    // 이렇게 해야 Vite 프록시가 가로채서 백엔드로 안전하게 배달해줍니다.
    window.location.href = `/oauth2/authorization/${provider}`;
  };

  return (
      <div
          className="relative w-full h-screen bg-cover bg-center overflow-hidden flex items-center justify-center"
          style={{ backgroundImage: "url('/images/background.jpg')" }}
      >
        {/*/!* 뒤로가기 버튼 *!/*/}
        {/*<Link*/}
        {/*    to="/"*/}
        {/*    className="absolute top-6 left-6 bg-[#fdf6e3] border-[4px] border-[#8b5a2b] p-2 rounded-2xl shadow-md hover:scale-110 transition"*/}
        {/*>*/}
        {/*  <span className="text-2xl text-[#8b5a2b]">🏠</span>*/}
        {/*</Link>*/}

        {/* 로그인 박스 */}
        <div className="relative w-[450px] bg-[#fdf6e3] p-10 rounded-[50px] border-[8px] border-[#8b5a2b] shadow-[15px_15px_0px_rgba(139,90,43,0.15)] flex flex-col items-center">
          {/* 상단 타이틀 */}
          <div className="absolute -top-10 bg-[#8b5a2b] px-10 py-3 rounded-[30px] border-[5px] border-white shadow-lg transform -rotate-2">
            <h1 className="text-3xl font-black text-white tracking-tight">
              지어봐요 마이홈
            </h1>
          </div>

          <div className="mt-8 w-full space-y-6">
            {/* 아이디 입력창 */}
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🍃</span>
              <input
                  type="text"
                  placeholder="아이디를 입력하세요"
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  className="w-full bg-[#efe7d1] border-none rounded-3xl py-4 pl-12 pr-4 text-[#5d4037] font-bold placeholder-[#a67c52] focus:ring-4 ring-[#8b5a2b]/20 outline-none transition-all"
              />
            </div>

            {/* 비밀번호 입력창 */}
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🔑</span>
              <input
                  type="password"
                  placeholder="비밀번호를 입력하세요"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  // 엔터키 지원
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                  className="w-full bg-[#efe7d1] border-none rounded-3xl py-4 pl-12 pr-4 text-[#5d4037] font-bold placeholder-[#a67c52] focus:ring-4 ring-[#8b5a2b]/20 outline-none transition-all"
              />
            </div>

            {/* 로그인 버튼 */}
            <button
                onClick={handleLogin}
                className="w-full bg-[#8b5a2b] hover:bg-[#6d4622] text-[#fdf6e3] py-5 rounded-[30px] text-2xl font-black shadow-lg transition-all active:scale-95"
            >
              로그인
            </button>
          </div>

          {/* 하단 보조 링크 */}
          <div className="mt-6 flex gap-6 text-[#8b5a2b] font-bold text-sm">
            <Link to="/join" className="hover:underline">회원가입</Link>
            <span className="text-[#a67c52]">|</span>
            <button className="hover:underline">아이디/비밀번호 찾기</button>
          </div>

          {/* 간편 로그인 구분선 */}
          <div className="w-full flex items-center gap-3 my-8">
            <div className="flex-1 h-[2px] bg-[#a67c52]/30"></div>
            <span className="text-[#a67c52] text-xs font-bold">간편 로그인</span>
            <div className="flex-1 h-[2px] bg-[#a67c52]/30"></div>
          </div>

          {/* 소셜 로그인 버튼들 */}
          {/*<div className="flex gap-5">*/}
          {/*  <button className="w-14 h-14 bg-white rounded-2xl border-[3px] border-[#efe7d1] shadow-md flex items-center justify-center hover:scale-110 transition active:translate-y-1">*/}
          {/*    <span className="font-bold text-gray-600">G</span>*/}
          {/*  </button>*/}
          {/*  <button className="w-14 h-14 bg-[#FEE500] rounded-2xl border-[3px] border-[#FEE500] shadow-md flex items-center justify-center hover:scale-110 transition active:translate-y-1">*/}
          {/*    <span className="font-bold text-[#3C1E1E]">K</span>*/}
          {/*  </button>*/}
          {/*  <button className="w-14 h-14 bg-[#03C75A] rounded-2xl border-[3px] border-[#03C75A] shadow-md flex items-center justify-center hover:scale-110 transition active:translate-y-1">*/}
          {/*    <span className="font-bold text-white text-xs">N</span>*/}
          {/*  </button>*/}
          {/*</div>*/}

          {/* 소셜 로그인 버튼들 */}
          {/*<div className="flex gap-5">*/}
          {/*  <button onClick={() => handleSocialLogin("google")} className="w-14 h-14 bg-white rounded-2xl border-[3px] border-[#efe7d1] shadow-md flex items-center justify-center hover:scale-110 transition active:translate-y-1">*/}
          {/*    <span className="font-bold text-gray-600">G</span>*/}
          {/*  </button>*/}
          {/*  <button onClick={() => handleSocialLogin("github")} className="w-14 h-14 bg-[#FEE500] rounded-2xl border-[3px] border-[#FEE500] shadow-md flex items-center justify-center hover:scale-110 transition active:translate-y-1">*/}
          {/*    <span className="font-bold text-[#3C1E1E]">G</span>*/}
          {/*  </button>*/}
          {/*  <button onClick={() => handleSocialLogin("naver")} className="w-14 h-14 bg-[#03C75A] rounded-2xl border-[3px] border-[#03C75A] shadow-md flex items-center justify-center hover:scale-110 transition active:translate-y-1">*/}
          {/*    <span className="font-bold text-white text-xs">N</span>*/}
          {/*  </button>*/}
          {/*</div>*/}
          <div className="flex gap-5">
            {/* 구글 버튼 */}
            <button
                onClick={() => handleSocialLogin("google")}
                // 기존 스타일(w-14 h-14 등)을 제거하고 SVG 컴포넌트로 교체합니다.
                // 호버 및 클릭 애니메이션만 남겨둡니다.
                className="hover:scale-110 transition active:translate-y-1"
                aria-label="구글 로그인"
            >
              <GoogleIcon />
            </button>

            {/* 깃허브 버튼 */}
            <button
                onClick={() => handleSocialLogin("github")}
                className="hover:scale-110 transition active:translate-y-1"
                aria-label="깃허브 로그인"
            >
              <GithubIcon />
            </button>

            {/* 네이버 버튼 */}
            <button
                onClick={() => handleSocialLogin("naver")}
                className="hover:scale-110 transition active:translate-y-1"
                aria-label="네이버 로그인"
            >
              <NaverIcon />
            </button>
          </div>
        </div>

        {/* 데코레이션 이미지 */}
        <div
            className="absolute bottom-10 left-10 w-32 h-32 bg-contain bg-no-repeat opacity-80"
            style={{ backgroundImage: "url('/images/isabelle.png')" }}
        ></div>
      </div>
  );
}