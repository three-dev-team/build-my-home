// import React, { useEffect, useRef, useState } from 'react';
// import { Link, useNavigate } from 'react-router-dom';
// import TopButtons from '../components/common/TopButtons';
// import AspectLayout from '../components/layout/AspectLayout';
// import AlertModal from '../components/common/AlertModal';
// import { getMemberInfo } from '../api/memberApi';
// import InstructionText from '../components/common/InstructionText.jsx';
//
// export default function Home() {
//   const [isLoggedIn, setIsLoggedIn] = useState(false);
//   const [nickname, setNickname] = useState('');
//   const [profileImage, setProfileImage] = useState(sessionStorage.getItem('profileImage'));
//   const [showUI, setShowUI] = useState(true);
//   const [fadeIn, setFadeIn] = useState(false);
//   const [showSuspendModal, setShowSuspendModal] = useState(false);
//   const [suspendedUntil, setSuspendedUntil] = useState(null);
//   const navigate = useNavigate();
//   const audioRef = useRef(null);
//   const videoRef = useRef(null);
//   const IMG = {
//     clickSvg: '/images/board/icon-click.svg',
//     clickWebp: '/images/board/icon-click.webp',
//   };
//
//   // --- (오디오 체크) ---
//   useEffect(() => {
//     let audioTimer;
//     if (audioRef.current) {
//       const savedVolume = localStorage.getItem('bgVolume');
//       const initialVolume = savedVolume !== null ? parseFloat(savedVolume) : 0.4;
//       audioRef.current.volume = initialVolume;
//       const playAudio = () => {
//         if (audioRef.current) {
//           audioRef.current.play().catch(() => {
//             console.log('자동 재생 차단됨: 사용자 상호작용 필요');
//           });
//         }
//       };
//       audioTimer = setTimeout(() => {
//         playAudio();
//       }, 1000);
//       window.addEventListener('click', playAudio, { once: true });
//     }
//     return () => {
//       if (audioTimer) clearTimeout(audioTimer);
//       if (audioRef.current && !audioRef.current.paused) {
//         audioRef.current.pause();
//         audioRef.current.currentTime = 0;
//       }
//     };
//   }, []);
//
//   useEffect(() => {
//     const token = sessionStorage.getItem('token');
//     const savedNickname = sessionStorage.getItem('nickname');
//
//     if (!token) {
//       // navigate('/'); // 토큰 없어도 홈은 볼 수 있게? or 로그인 강제? 기존 로직: navigate('/')
//       // 디자인 보기 위해 잠시 주석 처리 or isLoggedIn false로 유지
//     }
//
//     if (token) {
//       setIsLoggedIn(true);
//       setNickname(savedNickname || '주민');
//
//       // profileImage가 sessionStorage에 없으면 API에서 가져오기
//       if (!sessionStorage.getItem('profileImage')) {
//         getMemberInfo()
//           .then((res) => {
//             if (res.data.profileImage) {
//               sessionStorage.setItem('profileImage', res.data.profileImage);
//               setProfileImage(res.data.profileImage);
//             }
//           })
//           .catch(() => {
//           });
//       }
//     }
//
//     // 정지 정보 로드 및 자동 모달 표시
//     const isSuspended = sessionStorage.getItem('isSuspended') === 'true';
//     const suspended = sessionStorage.getItem('suspendedUntil');
//     const modalShown = sessionStorage.getItem('suspendModalShown') === 'true';
//
//     if (suspended) {
//       setSuspendedUntil(suspended);
//     }
//
//     // 정지된 유저는 최초 1회만 자동으로 모달 표시
//     if (isSuspended && !modalShown) {
//       setShowSuspendModal(true);
//       sessionStorage.setItem('suspendModalShown', 'true');
//     }
//
//     // 페이지 로드 시 페이드인 효과
//     setTimeout(() => {
//       setFadeIn(true);
//     }, 50);
//   }, [navigate]);
//
//   // 게임 시작 버튼 클릭 핸들러
//   const handleGameStart = () => {
//     if (!isLoggedIn) {
//       navigate('/login');
//       return;
//     }
//
//     const isSuspended = sessionStorage.getItem('isSuspended') === 'true';
//     if (isSuspended) {
//       setShowSuspendModal(true);
//     } else {
//       navigate('/room-list');
//     }
//   };
//
//   const handleBackgroundClick = () => {
//     handleGameStart();
//   };
//
//   // 정지 해제 시간 포맷
//   const formatSuspendedUntil = () => {
//     if (!suspendedUntil) return '';
//     const date = new Date(suspendedUntil);
//     return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${date.getHours()}시`;
//   };
//
//   const uiTransitionClass = `transition-all duration-1000 ease-out ${
//     showUI ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-[1cqw]'
//   }`;
//
//   // 공통 아이콘 박스 스타일 (80x80, rounded-full)
//   const iconBoxStyle =
//     'w-[80px] h-[80px] bg-white rounded-full flex items-center justify-center shadow-[0_4px_4px_rgba(0,0,0,0.1)] hover:scale-105 transition-transform cursor-pointer';
//
//   return (
//     <AspectLayout>
//       <div
//         onClick={handleBackgroundClick}
//         className={`relative w-full h-full bg-black bg-cover bg-center flex items-center justify-center overflow-hidden font-gosanja] transition-opacity duration-1000 ${
//           fadeIn ? 'opacity-100' : 'opacity-0'
//         }`}
//       >
//         {/* 배경 비디오 */}
//         <video
//           ref={videoRef}
//           autoPlay
//           loop
//           muted
//           playsInline
//           className="absolute top-0 left-0 w-full h-full object-cover pointer-events-none"
//           style={{ zIndex: 0 }}
//         >
//           <source src="/video/bg-home.mp4" type="video/mp4" />
//         </video>
//
//         {/* 배경음악 */}
//         <audio ref={audioRef} src="/sound/intro.mp3" loop />
//
//         {/* 2. 상단 우측 메뉴 (TopButtons 컴포넌트 사용)
//             - Top: 3.7cqh
//             - Right: 2.08cqw
//         */}
//         <div
//           className={`absolute top-[3.7cqh] right-[2.08cqw] z-50 ${uiTransitionClass}`}
//           onClick={(e) => e.stopPropagation()}
//         >
//           <TopButtons
//             nickname={isLoggedIn ? nickname : '로그인'}
//             profileImage={profileImage}
//             onProfileClick={() => navigate(isLoggedIn ? '/myPage' : '/login')}
//             onBellClick={() => navigate('/notifications')}
//             onConfigClick={() => navigate('/config')}
//             colors={{
//               text: '#594E36',
//               badgeBg: '#7B6C53', // coffeeBrown
//               badgeText: '#FFFEE0', // creamIvory
//             }}
//           />
//         </div>
//
//         {/*<audio ref={audioRef} src="/sounds/home_bgm.mp3" loop />*/}
//
//         {/* 1. 상단 좌측 로고 (위치/크기 조정)
//             - Top: 20px -> 1.04cqw
//             - Left: 56px -> 2.92cqw
//             - Width: 360px -> 18.75cqw
//             - Height: 180px -> 9.38cqw
//             - Image Width: 634px -> 33cqw (컨테이너보다 큼. 원본 유지 위해 w-[33cqw] 사용하거나 컨테이너에 맞춤)
//         */}
//         <header
//           className={`absolute top-[10%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 ${uiTransitionClass}`}
//           onClick={(e) => e.stopPropagation()}
//         >
//           <Link to="/home" className="inline-block hover:scale-105 transition-transform">
//             <img src="/images/ui-logo.png" alt="지어봐요 마이홈 로고" className="w-[25cqw] drop-shadow-md" />
//           </Link>
//         </header>
//
//         <InstructionText>
//             <span className="instruction-inline">
//             화면을 클릭해서 게임을 시작하세요
//             <img
//               src={IMG.clickSvg}
//               onError={(e) => {
//                 e.currentTarget.onerror = null;
//                 e.currentTarget.src = IMG.clickWebp;
//               }}
//               alt="click"
//               draggable={false}
//               className="instruction-click-icon"
//             />
//           </span>
//         </InstructionText>
//
//         {/* 3. 우측 하단 게임 시작 버튼 (540*190)
//             - Bottom: 24px -> 1.25cqw (bottom-6 approx)
//             - Right: 12px -> 0.63cqw (right-3 approx)
//             - Width: 540px -> 28.13cqw
//             - Height: 190px -> 9.9cqw
//         */}
//         {/*<div className={`absolute bottom-[1.25cqw] right-[0.63cqw] z-30 ${uiTransitionClass}`}>
//           <div onClick={handleGameStart} className="inline-block group cursor-pointer">
//             <img
//               src="/images/btn-start.png"
//               alt="게임 시작 버튼"
//               className="w-[28.13cqw] h-[9.9cqw] object-contain hover:scale-105 active:scale-95 transition-transform drop-shadow-[0_0.4cqw_0.2cqw_rgba(0,0,0,0.3)]"
//             />
//           </div>
//         </div>*/}
//
//         {/* 정지 안내 모달 */}
//         <AlertModal
//           isOpen={showSuspendModal}
//           message={`🚫 계정이 정지되었습니다.\n\n운영 정책 위반으로 게임 이용이\n제한되었습니다.\n\n정지 해제: ${formatSuspendedUntil()}\n\n이의제기 신청은 문의하기를 이용해주세요.`}
//           onConfirm={() => setShowSuspendModal(false)}
//         />
//       </div>
//     </AspectLayout>
//   );
// }

import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import TopButtons from '../components/common/TopButtons';
import AspectLayout from '../components/layout/AspectLayout';
import AlertModal from '../components/common/AlertModal';
import { getMemberInfo } from '../api/memberApi';
import InstructionText from '../components/common/InstructionText.jsx';
import CircleBlackout from '../components/common/CircleBlackout.jsx';

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [nickname, setNickname] = useState('');
  const [profileImage, setProfileImage] = useState(sessionStorage.getItem('profileImage'));
  const [fadeIn, setFadeIn] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendedUntil, setSuspendedUntil] = useState(null);
  const [showBlackout, setShowBlackout] = useState(false);
  const navigate = useNavigate();
  const audioRef = useRef(null);
  const IMG = {
    clickSvg: '/images/board/icon-click.svg',
    clickWebp: '/images/board/icon-click.webp',
  };

  // --- 오디오 ---
  useEffect(() => {
    let audioTimer;
    const playAudio = () => {
      if (audioRef.current) {
        audioRef.current.play().catch(() => {
          console.log('자동 재생 차단됨: 사용자 상호작용 필요');
        });
      }
    };

    if (audioRef.current) {
      const savedVolume = localStorage.getItem('bgVolume');
      const initialVolume = savedVolume !== null ? parseFloat(savedVolume) : 0.4;
      audioRef.current.volume = initialVolume;

      audioTimer = setTimeout(() => {
        playAudio();
      }, 1000);
      window.addEventListener('click', playAudio, { once: true });
    }

    return () => {
      if (audioTimer) clearTimeout(audioTimer);
      window.removeEventListener('click', playAudio, { capture: false });
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, []);

  // --- 초기화 ---
  useEffect(() => {
    let alive = true;
    const token = sessionStorage.getItem('token');
    const savedNickname = sessionStorage.getItem('nickname');

    if (token) {
      setIsLoggedIn(true);
      setNickname(savedNickname || '주민');

      if (!sessionStorage.getItem('profileImage')) {
        getMemberInfo()
          .then((res) => {
            if (alive && res.data.profileImage) {
              sessionStorage.setItem('profileImage', res.data.profileImage);
              setProfileImage(res.data.profileImage);
            }
          })
          .catch(() => {});
      }
    }

    const isSuspended = sessionStorage.getItem('isSuspended') === 'true';
    const suspended = sessionStorage.getItem('suspendedUntil');
    const modalShown = sessionStorage.getItem('suspendModalShown') === 'true';

    if (suspended) setSuspendedUntil(suspended);

    if (isSuspended && !modalShown) {
      setShowSuspendModal(true);
      sessionStorage.setItem('suspendModalShown', 'true');
    }

    const fadeTimer = setTimeout(() => setFadeIn(true), 50);

    return () => {
      alive = false;
      clearTimeout(fadeTimer);
    };
  }, []);

  const handleGameStart = () => {
    if (!isLoggedIn) {
      setShowBlackout(true);
      return;
    }

    const isSuspended = sessionStorage.getItem('isSuspended') === 'true';
    if (isSuspended) {
      setShowSuspendModal(true);
    } else {
      setShowBlackout(true);
    }
  };

  const handleBlackoutDone = () => {
    if (!isLoggedIn) {
      navigate('/login');
    } else {
      navigate('/room-list');
    }
  };

  const handleBackgroundClick = () => {
    if (showSuspendModal) return; // 모달 열려있으면 무시
    handleGameStart();
  };

  const formatSuspendedUntil = () => {
    if (!suspendedUntil) return '';
    const date = new Date(suspendedUntil);
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${date.getHours()}시`;
  };

  const uiTransitionClass = 'transition-all duration-1000 ease-out opacity-100 translate-y-0';

  return (
    <AspectLayout>
      <div
        onClick={handleBackgroundClick}
        className={`relative w-full h-full bg-black bg-cover bg-center flex items-center justify-center overflow-hidden font-gosanja transition-opacity duration-1000 ${
          fadeIn ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <video
          autoPlay loop muted playsInline
          className="absolute top-0 left-0 w-full h-full object-cover pointer-events-none"
          style={{ zIndex: 0 }}
        >
          <source src="/video/bg-home.mp4" type="video/mp4" />
        </video>

        <audio ref={audioRef} src="/sound/intro.mp3" loop />

        <div
          className={`absolute top-[3.7cqh] right-[2.08cqw] z-50 ${uiTransitionClass}`}
          onClick={(e) => e.stopPropagation()}
        >
          <TopButtons
            nickname={isLoggedIn ? nickname : '로그인'}
            profileImage={profileImage}
            onProfileClick={() => navigate(isLoggedIn ? '/mypage' : '/login')}
            onBellClick={() => navigate('/notifications')}
            onConfigClick={() => navigate('/config')}
            colors={{
              text: '#594E36',
              badgeBg: '#7B6C53',
              badgeText: '#FFFEE0',
            }}
          />
        </div>

        <header
          className={`absolute top-[10%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 ${uiTransitionClass}`}
          onClick={(e) => e.stopPropagation()}
        >
          <Link to="/home" className="inline-block hover:scale-105 transition-transform">
            <img src="/images/ui-logo.png" alt="지어봐요 마이홈 로고" className="w-[25cqw] drop-shadow-md" />
          </Link>
        </header>

        <InstructionText>
          <span className="instruction-inline">
            화면을 클릭해서 게임을 시작하세요
            <img
              src={IMG.clickSvg}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = IMG.clickWebp;
              }}
              alt="click"
              draggable={false}
              className="instruction-click-icon"
            />
          </span>
        </InstructionText>

        <AlertModal
          isOpen={showSuspendModal}
          message={`🚫 계정이 정지되었습니다.\n\n운영 정책 위반으로 게임 이용이\n제한되었습니다.\n\n정지 해제: ${formatSuspendedUntil()}\n\n이의제기 신청은 문의하기를 이용해주세요.`}
          onConfirm={() => setShowSuspendModal(false)}
        />
      </div>

      <CircleBlackout
        show={showBlackout}
        type="close"
        duration={1000}
        onDone={handleBlackoutDone}
      />
    </AspectLayout>
  );
}
