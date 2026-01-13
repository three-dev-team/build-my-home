import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [nickname, setNickname] = useState("");
  // 1. 들어가자마자 버튼이 보이도록 초기값을 true로 변경
  const [showUI, setShowUI] = useState(true);
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const audioRef = useRef(null);

  // --- 기존 로직 유지 (오디오/비디오/로그인 체크) ---
  useEffect(() => {
    let audioTimer;
    if (audioRef.current) {
      const savedVolume = localStorage.getItem("bgVolume");
      const initialVolume = savedVolume !== null ? parseFloat(savedVolume) : 0.4;
      audioRef.current.volume = initialVolume;
      const playAudio = () => {
        if (audioRef.current) {
          audioRef.current.play().catch(() => {
            console.log("자동 재생 차단됨: 사용자 상호작용 필요");
          });
        }
      };
      audioTimer = setTimeout(() => { playAudio(); }, 1000);
      window.addEventListener("click", playAudio, { once: true });
    }
    return () => {
      if (audioTimer) clearTimeout(audioTimer);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.defaultMuted = true;
      videoRef.current.muted = true;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => console.log("자동 재생 차단:", error));
      }
    }
  }, []);

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    const savedNickname = sessionStorage.getItem("nickname");
    if (token) {
      setIsLoggedIn(true);
      setNickname(savedNickname || "주민");
    }
  }, []);

  // 애니메이션 클래스 (즉시 표시를 위해 duration 유지)
  const uiTransitionClass = `transition-all duration-1000 ease-out ${
      showUI ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
  }`;

  return (
      <div className="relative w-full h-screen overflow-hidden bg-black">
        {/* 주석 유지 영역 */}
        {/*<audio ref={audioRef} src="/sounds/home_bgm.mp3" loop />*/}
        {/*<video ... />*/}

        <div className="absolute inset-0 bg-black/10 -z-5" />

        {/* 1. 상단 좌측 로고 */}
        <header className={`absolute top-0 left-0 z-10 ${uiTransitionClass}`}>
          <Link to="/home" className="inline-block transform hover:scale-105 transition-transform">
            <img
                src="/images/logo.png"
                alt="지어봐요 마이홈 로고"
                className="w-[350px] drop-shadow-[0_4px_4px_rgba(0,0,0,0.25)]"
            />
          </Link>
        </header>

        {/* 2. 상단 우측 메뉴 (유저, 알람 2개로 변경) */}
        <div className={`absolute top-6 right-10 z-20 flex gap-8 items-start ${uiTransitionClass}`}>
          {/* 유저(마이페이지) 버튼 */}
          <Link to={isLoggedIn ? "/myPage" : "/login"} className="flex flex-col items-center gap-2 group">
            <div className="w-16 h-16 bg-[#efe7d1] border-[4px] border-[#a67c52] rounded-full flex items-center justify-center text-3xl shadow-md group-hover:scale-110 transition-transform">
              👤
            </div>
            <span className="text-sm font-black text-[#8b5a2b] bg-white/90 px-3 py-0.5 rounded-full shadow-sm">
            {isLoggedIn ? `${nickname}님` : "로그인"}
          </span>
          </Link>

          {/* 알람 버튼 (새로 추가) */}
          <Link to="/notifications" className="flex flex-col items-center gap-2 group">
            <div className="w-16 h-16 bg-[#efe7d1] border-[4px] border-[#a67c52] rounded-full flex items-center justify-center text-3xl shadow-md group-hover:scale-110 transition-transform">
              🔔
            </div>
            <span className="text-sm font-black text-[#8b5a2b] bg-white/90 px-3 py-0.5 rounded-full shadow-sm">알림</span>
          </Link>
        </div>

        {/* 3. 우측 하단 게임 시작 버튼 */}
        <div className={`absolute bottom-6 right-3 z-30 ${uiTransitionClass}`}>
          <Link to={isLoggedIn ? "/room-list" : "/login"} className="inline-block group">
            <img
                src="/images/start_button.png"
                alt="게임 시작 버튼"
                className="w-[500px] hover:scale-105 active:scale-95 transition-transform drop-shadow-[0_8px_4px_rgba(0,0,0,0.3)]"
            />
          </Link>
        </div>
      </div>
  );
}