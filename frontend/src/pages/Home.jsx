import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [nickname, setNickname] = useState("");
  const [showUI, setShowUI] = useState(false); // 1. UI 표시 상태 추가
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    let audioTimer;

    if (audioRef.current) {
      // 1. 볼륨 설정
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

      // 2. 2초 후에 재생 시도
      audioTimer = setTimeout(() => {
        playAudio();
      }, 1000);

      // 3. 사용자가 2초 이전에 클릭하더라도, 2초 뒤에 소리가 나게 하거나
      // 즉시 소리가 나게 하려면 아래 리스너를 유지합니다.
      window.addEventListener("click", playAudio, { once: true });
    }

    return () => {
      if (audioTimer) clearTimeout(audioTimer);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      window.removeEventListener("click", () => {});
    };
  }, []);

  useEffect(() => {
    // 2. 2.5초 후에 UI를 나타나게 설정
    const timer = setTimeout(() => {
      setShowUI(true);
    }, 2500);

    return () => clearTimeout(timer); // 언마운트 시 타이머 제거
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      const savedVolume = localStorage.getItem("bgVolume");
      const initialVolume = savedVolume !== null ? parseFloat(savedVolume) : 0.4;
      audioRef.current.volume = initialVolume;

      const playAudio = () => {
        audioRef.current.play().catch(() => {
          console.log("상호작용 대기 중...");
        });
      };

      playAudio();
      window.addEventListener("click", playAudio, { once: true });
    }

    return () => {
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

  // 공통 애니메이션 클래스 (투명도 조절)
  const uiTransitionClass = `transition-all duration-1000 ease-out ${
      showUI ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
  }`;

  return (
      <div className="relative w-full h-screen overflow-hidden bg-black">
        {/*<audio ref={audioRef} src="/sounds/home_bgm.mp3" loop />*/}

        {/* 1. 배경 비디오 (항상 먼저 나옴) */}
        {/*<video*/}
        {/*    ref={videoRef}*/}
        {/*    loop*/}
        {/*    muted*/}
        {/*    playsInline*/}
        {/*    className="absolute top-0 left-0 w-full h-full object-cover"*/}
        {/*    style={{ zIndex: 0 }}*/}
        {/*>*/}
        {/*  <source src="/videos/background.mp4" type="video/mp4" />*/}
        {/*</video>*/}

        <div className="absolute inset-0 bg-black/10 -z-5" />

        {/* --- 여기서부터는 지연되어 나타나는 UI 영역 --- */}

        {/* 2. 상단 좌측 로고 */}
        {/*<header className={`absolute top-8 left-8 z-10 ${uiTransitionClass}`}>*/}
        {/*  <Link to="/home" className="inline-block transform hover:scale-105 transition-transform">*/}
        {/*    <div className="bg-[#8b5a2b] px-10 py-4 rounded-[35px] border-[6px] border-[#fdf6e3] shadow-[0_8px_0_rgba(0,0,0,0.2)]">*/}
        {/*      <h1 className="text-4xl font-black text-[#fdf6e3] tracking-tighter">*/}
        {/*        지어봐요 마이홈*/}
        {/*      </h1>*/}
        {/*    </div>*/}
        {/*  </Link>*/}
        {/*</header>*/}
        {/* 2. 상단 좌측 로고 이미지로 변경 */}
        <header className={`absolute top-0 left-0 z-10 ${uiTransitionClass}`}>
          <Link to="/home" className="inline-block transform hover:scale-105 transition-transform">
            {/* 기존 텍스트 로고를 이미지로 교체 */}
            <img
                src="/images/logo.png" // 실제 이미지 경로로 변경 필요
                alt="지어봐요 마이홈 로고"
                className="w-[350px] drop-shadow-[0_4px_4px_rgba(0,0,0,0.25)]" // 크기 및 그림자 조절
            />
          </Link>
        </header>

        {/* 3. 상단 우측 메뉴 */}
        <div className={`absolute top-4 right-8 z-20 flex gap-8 items-start ${uiTransitionClass}`}>
          <Link to={isLoggedIn ? "/myPage" : "/login"} className="flex flex-col items-center gap-2 group">
            <div className="w-16 h-16 bg-[#efe7d1] border-[4px] border-[#a67c52] rounded-full flex items-center justify-center text-3xl shadow-md group-hover:scale-110 transition-transform">
              👤
            </div>
            <span className="text-sm font-black text-[#8b5a2b] bg-white/90 px-3 py-0.5 rounded-full shadow-sm">
            {isLoggedIn ? `${nickname}님` : "로그인"}
          </span>
          </Link>

          <Link to="/store" className="flex flex-col items-center gap-2 group">
            <div className="w-16 h-16 bg-[#efe7d1] border-[4px] border-[#a67c52] rounded-full flex items-center justify-center text-3xl shadow-md group-hover:scale-110 transition-transform">
              🛒
            </div>
            <span className="text-sm font-black text-[#8b5a2b] bg-white/90 px-3 py-0.5 rounded-full shadow-sm">상점</span>
          </Link>

          <Link to="/config" className="flex flex-col items-center gap-2 group">
            <div className="w-16 h-16 bg-[#efe7d1] border-[4px] border-[#a67c52] rounded-full flex items-center justify-center text-3xl shadow-md group-hover:scale-110 transition-transform">
              ⚙️
            </div>
            <span className="text-sm font-black text-[#8b5a2b] bg-white/90 px-3 py-0.5 rounded-full shadow-sm">환경설정</span>
          </Link>
        </div>

        {/* 4. 우측 하단 게임 시작 버튼 */}
        {/*<div className={`absolute bottom-6 right-3 z-30 ${uiTransitionClass}`}>*/}
        {/*  <Link to={isLoggedIn ? "/loading" : "/login"} className="group flex flex-col items-center gap-4">*/}
        {/*    <div className="bg-[#d4a373] px-20 py-8 rounded-[40px] border-[8px] border-[#8b5a2b] shadow-[0_12px_0_rgba(139,90,43,0.4)] group-hover:bg-[#bc8a5f] group-hover:translate-y-1 transition-all flex flex-col items-center">*/}
        {/*      <span className="text-4xl font-black text-white drop-shadow-md mb-1">게임 시작</span>*/}
        {/*      <span className="text-lg font-bold text-white/90 tracking-[0.2em] uppercase">*/}
        {/*      {isLoggedIn ? "Game Start" : "Please Login"}*/}
        {/*    </span>*/}
        {/*    </div>*/}
        {/*  </Link>*/}
        {/*</div>*/}

        {/* 4. 우측 하단 게임 시작 버튼 (이미지로 변경됨) */}
        <div className={`absolute bottom-6 right-3 z-30 ${uiTransitionClass}`}>
          <Link to={isLoggedIn ? "/loading" : "/login"} className="inline-block group">
            {/* 기존 CSS 스타일 버튼 코드를 모두 제거하고 이미지 태그로 교체 */}
            <img
                src="/images/start_button.png" // 실제 사용할 버튼 이미지 경로를 입력해주세요.
                alt="게임 시작 버튼"
                // w-[320px]: 너비 설정 (필요에 따라 조절)
                // hover:scale-105: 마우스 올렸을 때 약간 커짐
                // active:scale-95: 클릭했을 때 약간 작아짐 (눌리는 느낌)
                // drop-shadow: 이미지에 그림자 추가하여 입체감 부여
                className="w-[500px] hover:scale-105 active:scale-95 transition-transform drop-shadow-[0_8px_4px_rgba(0,0,0,0.3)]"
            />
          </Link>
        </div>

      </div>
  );
}