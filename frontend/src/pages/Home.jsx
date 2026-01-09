import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom"; // useNavigate 추가

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const [nickname, setNickname] = useState("");

  const navigate = useNavigate();

  // 1. 컴포넌트 마운트 시 세션 스토리지 확인

  useEffect(() => {
    // [변경] localStorage -> sessionStorage

    const token = sessionStorage.getItem("token");

    const savedNickname = sessionStorage.getItem("nickname");

    if (token) {
      setIsLoggedIn(true);

      setNickname(savedNickname || "주민");
    } else {
      setIsLoggedIn(false);
    }
  }, []);

  // 2. 로그아웃 핸들러

  const handleLogout = () => {
    // [변경] sessionStorage 데이터 삭제

    sessionStorage.clear();

    alert("로그아웃 되었습니다. 다음에 또 만나요! 🍃");

    // 상태 반영을 위해 메인으로 이동하거나 새로고침

    setIsLoggedIn(false);

    setNickname("");

    navigate("/");
  };

  return (
    <div
      className="relative w-full h-screen bg-cover bg-center overflow-hidden"

      // style={{

      // backgroundImage: "url('/images/background.jpg')",

      // }}
    >
      {/* 1. 상단 좌측: 게임 로고 */}

      <header className="absolute top-8 left-8 z-10">
        <Link
          to="/home"
          className="inline-block transform hover:scale-105 transition-transform"
        >
          <div className="bg-[#8b5a2b] px-10 py-4 rounded-[35px] border-[6px] border-[#fdf6e3] shadow-[0_8px_0_rgba(0,0,0,0.2)]">
            <h1 className="text-4xl font-black text-[#fdf6e3] tracking-tighter">
              지어봐요 마이홈
            </h1>
          </div>
        </Link>
      </header>

      {/* 로고2 */}

      {/*<header className="absolute top-6 left-8 z-50">*/}

      {/* <Link to="/" className="block group">*/}

      {/* <div className="relative">*/}

      {/*<span className="block text-2xl font-black text-[#8b5a2b] tracking-tighter -mb-2 ml-2 drop-shadow-sm">*/}

      {/* 지어봐요*/}

      {/*</span>*/}

      {/* <div className="bg-[#f7d31c] px-6 py-1 rounded-2xl border-[4px] border-[#8b5a2b] shadow-[3px_3px_0px_#6d4622] transform -rotate-2 group-hover:scale-105 transition-transform">*/}

      {/* <h1 className="text-4xl font-black text-[#5d4037] tracking-tight">*/}

      {/* 마이홈*/}

      {/* </h1>*/}

      {/* </div>*/}

      {/* <span className="absolute -top-3 -right-2 text-3xl drop-shadow-md rotate-12">*/}

      {/* 🍃*/}

      {/*</span>*/}

      {/* </div>*/}

      {/* </Link>*/}

      {/*</header>*/}

      {/*/!* 2. 우측 중앙: 방 만들기 (Create Room) 패널 *!/*/}

      {/*<aside className="absolute right-12 top-1/2 -translate-y-1/2 w-[340px] bg-[#fdf6e3]/95 p-7 rounded-[50px] border-[6px] border-[#8b5a2b] shadow-2xl z-20">*/}

      {/* <div className="flex justify-between items-center mb-6">*/}

      {/* <h2 className="text-2xl font-black text-[#8b5a2b]">Create Room</h2>*/}

      {/* <button className="w-9 h-9 flex items-center justify-center bg-[#8b5a2b] text-white rounded-full font-bold shadow-md hover:brightness-110">X</button>*/}

      {/* </div>*/}

      {/* <div className="space-y-6">*/}

      {/* /!* 방 제목 입력 *!/*/}

      {/* <div className="bg-[#efe7d1] p-4 rounded-2xl border-2 border-[#a67c52]/30">*/}

      {/* <label className="block text-xs font-black text-[#a67c52] mb-1 uppercase tracking-wider">Room Title</label>*/}

      {/* <input*/}

      {/* type="text"*/}

      {/* className="w-full bg-transparent border-none focus:ring-0 p-0 text-[#5d4037] font-bold text-lg"*/}

      {/* placeholder="마이홈에 놀러와!"*/}

      {/* />*/}

      {/* </div>*/}

      {/* /!* 인원 설정 *!/*/}

      {/* <div className="bg-[#efe7d1] p-4 rounded-2xl border-2 border-[#a67c52]/30 flex justify-between items-center">*/}

      {/* <label className="text-sm font-black text-[#8b5a2b]">Max Players</label>*/}

      {/* <div className="flex items-center gap-3">*/}

      {/* <span className="w-8 h-8 flex items-center justify-center bg-white rounded-full border-2 border-[#a67c52] text-[#8b5a2b] font-bold">4</span>*/}

      {/* </div>*/}

      {/* </div>*/}

      {/* /!* 캐릭터 리스트 슬롯 (이미지 참조) *!/*/}

      {/* <div className="grid grid-cols-4 gap-2 py-2">*/}

      {/* {[1, 2, 3, 4].map((i) => (*/}

      {/* <div key={i} className="w-14 h-14 bg-white/50 rounded-xl border-2 border-[#a67c52] flex items-center justify-center text-2xl shadow-inner">*/}

      {/* {i === 1 ? '🐶' : i === 2 ? '🐱' : '🐰'}*/}

      {/* </div>*/}

      {/* ))}*/}

      {/* </div>*/}

      {/* <button className="w-full bg-[#8b5a2b] text-[#fdf6e3] py-5 rounded-[30px] text-2xl font-black shadow-[0_6px_0_#5d4037] hover:brightness-110 hover:translate-y-0.5 active:translate-y-1 active:shadow-none transition-all">*/}

      {/* Action*/}

      {/* </button>*/}

      {/* </div>*/}

      {/*</aside>*/}

      {/*/!* 2. 우측 중앙: 방 만들기 (이미지의 Create Room 레이아웃) *!/*/}

      {/*<aside className="absolute right-10 top-1/2 -translate-y-1/2 w-80 bg-[#fdf6e3] p-6 rounded-[40px] border-[6px] border-[#8b5a2b] shadow-2xl z-20">*/}

      {/* <div className="flex justify-between items-center mb-5">*/}

      {/* <h2 className="text-2xl font-black text-[#8b5a2b]">Create Room</h2>*/}

      {/* <button className="w-8 h-8 flex items-center justify-center bg-[#8b5a2b] text-white rounded-full font-bold">*/}

      {/* X*/}

      {/* </button>*/}

      {/* </div>*/}

      {/* <div className="space-y-5">*/}

      {/* <div className="bg-[#efe7d1] p-3 rounded-2xl">*/}

      {/* <label className="block text-sm font-bold text-[#8b5a2b] mb-1">*/}

      {/* Room Title*/}

      {/* </label>*/}

      {/* <input*/}

      {/* type="text"*/}

      {/* className="w-full bg-transparent border-none focus:ring-0 p-0 text-[#5d4037]"*/}

      {/* placeholder="마이홈에 놀러와!"*/}

      {/* />*/}

      {/* </div>*/}

      {/* <div className="bg-[#efe7d1] p-3 rounded-2xl flex justify-between items-center">*/}

      {/* <label className="text-sm font-bold text-[#8b5a2b]">*/}

      {/* Max Players*/}

      {/* </label>*/}

      {/* <span className="font-bold text-[#5d4037]">4명</span>*/}

      {/* </div>*/}

      {/* <button className="w-full bg-[#8b5a2b] text-[#fdf6e3] py-4 rounded-3xl text-xl font-black shadow-lg hover:brightness-110 active:scale-95 transition-all">*/}

      {/* Action*/}

      {/* </button>*/}

      {/* </div>*/}

      {/*</aside>*/}

      {/* 3. 게임 시작 버튼 (z-index 확인) */}

      {/*<div className="absolute bottom-40 left-1/2 -translate-x-1/2 z-30">*/}

      {/* /!* bottom-40으로 더 확실히 올렸습니다 *!/*/}

      {/* <Link to="/login" className="group relative flex flex-col items-center">*/}

      {/* <div className="bg-[#d4a373] px-20 py-8 rounded-[40px] border-[8px] border-[#8b5a2b] shadow-[0_12px_0_rgba(139,90,43,0.4)] group-hover:bg-[#bc8a5f] transition-all">*/}

      {/* <span className="text-4xl font-black text-white drop-shadow-md">*/}

      {/* 게임 시작*/}

      {/* </span>*/}

      {/* </div>*/}

      {/* </Link>*/}

      {/*</div>*/}

      {/* 상단 우측: 로그인 상태일 때만 로그아웃 표시 */}

      {isLoggedIn && (
        <div className="absolute top-8 right-8 z-10 flex items-center gap-4">
          <Link
              to="/myPage"
              className="text-[#8b5a2b] font-black bg-white/80 px-4 py-2 rounded-full hover:scale-105 shadow-sm"
          >
            {/* useEffect에서 세팅된 nickname 상태값을 사용하세요 */}
            {nickname}님 🍃
          </Link>

          <button
            onClick={handleLogout}
            className="bg-[#8b5a2b] text-white px-4 py-2 rounded-xl font-bold text-sm shadow-md hover:scale-105 transition"
          >
            로그아웃
          </button>
        </div>
      )}

      {/*/!* 2. 화면 정중앙: 게임 시작 버튼 (조건부 링크 적용) *!/*/}

      {/*<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30">*/}
      {/*  /!* 로그인 여부에 따라 /loading 또는 /login으로 이동 *!/*/}

      {/*  <Link*/}
      {/*    to={isLoggedIn ? "/loading" : "/login"}*/}
      {/*    className="group flex flex-col items-center gap-4"*/}
      {/*  >*/}
      {/*    <div className="bg-[#d4a373] px-24 py-10 rounded-[50px] border-[8px] border-[#8b5a2b] shadow-[0_12px_0_rgba(139,90,43,0.4)] group-hover:bg-[#bc8a5f] group-hover:translate-y-1 group-active:shadow-none transition-all flex flex-col items-center">*/}
      {/*      <span className="text-5xl font-black text-white drop-shadow-md mb-1">*/}
      {/*        게임 시작*/}
      {/*      </span>*/}

      {/*      <span className="text-xl font-bold text-white/90 tracking-[0.2em] uppercase">*/}
      {/*        {isLoggedIn ? "Game Start" : "Please Login"}*/}
      {/*      </span>*/}
      {/*    </div>*/}
      {/*  </Link>*/}
      {/*</div>*/}

      {/* 2. 화면 우측 하단: 게임 시작 버튼 */}
      <div className="absolute bottom-12 right-12 z-30">
        <Link
            to={isLoggedIn ? "/loading" : "/login"}
            className="group flex flex-col items-center gap-4"
        >
          {/* 우측 하단으로 이동하면서 크기를 살짝 조정하고 싶다면 px-24를 px-16 정도로 조절해도 좋습니다 */}
          <div className="bg-[#d4a373] px-20 py-8 rounded-[40px] border-[8px] border-[#8b5a2b] shadow-[0_12px_0_rgba(139,90,43,0.4)] group-hover:bg-[#bc8a5f] group-hover:translate-y-1 group-active:shadow-none transition-all flex flex-col items-center">
            <span className="text-4xl font-black text-white drop-shadow-md mb-1">
              게임 시작
            </span>

            <span className="text-lg font-bold text-white/90 tracking-[0.2em] uppercase">
              {isLoggedIn ? "Game Start" : "Please Login"}
            </span>
          </div>
        </Link>
      </div>

      {/* 4. 최하단: 보조 메뉴 (Shop, Settings) */}

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-12 z-10">
        <Link
          to="/store"
          className="flex flex-col items-center gap-1 cursor-pointer group"
        >
          <div className="w-14 h-14 bg-[#efe7d1] border-[4px] border-[#a67c52] rounded-2xl flex items-center justify-center text-2xl shadow-md group-hover:-translate-y-1 transition-transform">
            🛒
          </div>

          <span className="text-xs font-black text-[#5d4037] bg-white/80 px-3 rounded-full shadow-sm">
            Store
          </span>
        </Link>

        <Link
          to="/config"
          className="flex flex-col items-center gap-1 cursor-pointer group"
        >
          <div className="w-14 h-14 bg-[#efe7d1] border-[4px] border-[#a67c52] rounded-2xl flex items-center justify-center text-2xl shadow-md group-hover:-translate-y-1 transition-transform">
            ⚙️
          </div>

          <span className="text-xs font-black text-[#5d4037] bg-white/80 px-3 rounded-full shadow-sm">
            Config
          </span>
        </Link>
      </div>
    </div>
  );
}
