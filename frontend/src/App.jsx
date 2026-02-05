import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Login from './pages/auth/Login.jsx';
import Config from './pages/Config.jsx';
import Store from './pages/Store.jsx';
import Room from './pages/room/Room.jsx';
import CharacterSelect from './pages/room/CharacterSelect.jsx';
import RoomList from './pages/room/RoomList.jsx';
import Join from './pages/auth/Join.jsx';
import MyPage from './pages/MyPage.jsx';
import OAuth2RedirectHandler from './pages/auth/OAuth2RedirectHandler.jsx';
import AdminPage from './pages/AdminPage.jsx';
import UserInquiry from './pages/UserInquiry.jsx';
import GamePage from './pages/game/GamePage.jsx';
import NotFound from './pages/NotFound.jsx';
import Loading from './components/common/Loading.jsx';
import AlertModal from './components/common/AlertModal.jsx';
import ZoomWarningModal from './components/common/ZoomWarningModal.jsx';
import usePlayTimeWarning from './hooks/usePlayTimeWarning.js';

function App() {
  const audioRef = useRef(null);
  const [isMuted, setIsMuted] = useState(true);
  // 기능 수정을 위해 필요한 상태 선언
  const [isInitialized, setIsInitialized] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false); // 모달 상태 추가

  // 2시간 플레이 경고
  const { showWarning, playMinutes, dismissWarning } = usePlayTimeWarning(120);

  // 브라우저 배율 경고 (실시간 감지)
  const [showZoomWarning, setShowZoomWarning] = useState(window.devicePixelRatio !== 1);

  useEffect(() => {
    const checkZoom = () => {
      if (window.devicePixelRatio !== 1) {
        setShowZoomWarning(true);
      }
    };

    window.addEventListener('resize', checkZoom);
    window.addEventListener('focus', checkZoom);

    return () => {
      window.removeEventListener('resize', checkZoom);
      window.removeEventListener('focus', checkZoom);
    };
  }, []);

  // 마우스 우클릭 방지
  useEffect(() => {
    const handleContextMenu = (e) => e.preventDefault();
    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  // 로그인 필수 - 토큰 없으면 로그인 페이지로 이동
  const ProtectedRoute = ({ children }) => {
    const token = sessionStorage.getItem('token');
    if (!token) {
      return <Navigate to="/" replace />;
    }
    return children;
  };

  // 권한 확인 - 경로로 admin 페이지로 들어오려고 하면 차단
  const ProtectedAdminRoute = ({ children }) => {
    const userRole = sessionStorage.getItem('role');
    const token = sessionStorage.getItem('token');
    if (!token) {
      return <Navigate to="/" replace />;
    }
    if (userRole !== 'ADMIN') {
      alert('관리자만 접근 가능한 페이지입니다! ⛔');
      return <Navigate to="/home" replace />;
    }
    return children;
  };

  // 사용자가 사이트 어디든 처음 클릭하면 재생 시작 (브라우저 정책 대응)
  useEffect(() => {
    const handleFirstInteraction = () => {
      if (audioRef.current) {
        audioRef.current.play().catch((e) => console.log('재생 실패:', e));
        setIsMuted(false);
      }
      // 한 번 실행 후 이벤트 제거
      window.removeEventListener('click', handleFirstInteraction);
    };

    window.addEventListener('click', handleFirstInteraction);
    return () => window.removeEventListener('click', handleFirstInteraction);
  }, []);

  // 초기화 완료 처리 (백업 로직 삭제로 인해 바로 true)
  useEffect(() => {
    // [Session Only Policy] 로컬 스토리지에 남아있는 토큰 정보 삭제 (보안 강화)
    localStorage.removeItem('token');
    localStorage.removeItem('nickname');
    localStorage.removeItem('bell');
    localStorage.removeItem('level');

    setIsInitialized(true);
  }, []);

  // ✅ 중복 로그인 감지 이벤트 리스너
  useEffect(() => {
    const handleForceLogout = () => setLogoutModalOpen(true);
    window.addEventListener('forceLogout', handleForceLogout);
    return () => window.removeEventListener('forceLogout', handleForceLogout);
  }, []);

  // 초기화가 완료되기 전에는 렌더링을 잠시 멈춤 (에러 방지)
  if (!isInitialized) return null;

  if (!isInitialized) return <Loading />;

  return (
    <>
      <Router>
        <Routes>
          {/* 공개 페이지 (로그인 불필요) */}
          <Route path="/" element={<Login />} />
          <Route path="/join" element={<Join />} />
          <Route path="/oauth2/redirect" element={<OAuth2RedirectHandler />} />

          {/* 로그인 필수 페이지 */}
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/config"
            element={
              <ProtectedRoute>
                <Config />
              </ProtectedRoute>
            }
          />
          <Route
            path="/store"
            element={
              <ProtectedRoute>
                <Store />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rooms/:roomId"
            element={
              <ProtectedRoute>
                <Room />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rooms/:roomId/select"
            element={
              <ProtectedRoute>
                <CharacterSelect />
              </ProtectedRoute>
            }
          />
          <Route
            path="/room-list"
            element={
              <ProtectedRoute>
                <RoomList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mypage"
            element={
              <ProtectedRoute>
                <MyPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/games/:roomId"
            element={
              <ProtectedRoute>
                <GamePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user-inquiry"
            element={
              <ProtectedRoute>
                <UserInquiry />
              </ProtectedRoute>
            }
          />

          {/* 관리자 전용 */}
          <Route
            path="/admin"
            element={
              <ProtectedAdminRoute>
                <AdminPage />
              </ProtectedAdminRoute>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>

      {/* ✅ 중복 로그인 알림 모달 */}
      <AlertModal
        isOpen={logoutModalOpen}
        icon="⚠️"
        title="연결이 끊어졌어요!"
        message={
          <>
            다른 기기에서 접속하여 로그아웃 되었습니다.
            <br />
            다시 로그인해 주세요.
          </>
        }
        onConfirm={() => {
          setLogoutModalOpen(false);
          window.location.href = '/';
        }}
      />

      {/* ✅ 2시간 플레이 경고 모달 */}
      <AlertModal
        isOpen={showWarning}
        icon="⏰"
        title="휴식이 필요해요!"
        message={
          <>
            {Math.floor(playMinutes / 60) > 0 ? `${Math.floor(playMinutes / 60)}시간 ` : ''}
            {playMinutes % 60}분째 플레이 중이에요.
            <br />
            잠시 쉬어가는 건 어떨까요? 🌿
          </>
        }
        confirmText="알겠어요"
        onConfirm={dismissWarning}
      />

      {/* ✅ 브라우저 배율 경고 모달 */}
      {showZoomWarning && <ZoomWarningModal onDismiss={() => setShowZoomWarning(false)} />}
    </>
  );
}

export default App;
