import React, { useState, useEffect, useRef } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Home from "./pages/Home.jsx";
import Login from "./pages/auth/Login.jsx";
import Config from "./pages/Config.jsx";
import Store from "./pages/Store.jsx";
import Room from "./pages/room/Room.jsx";
import CharacterSelect from "./pages/room/CharacterSelect.jsx";
import RoomList from "./pages/room/RoomList.jsx";
import Join from "./pages/auth/Join.jsx";
import MyPage from "./pages/MyPage.jsx";
import OAuth2RedirectHandler from "./pages/auth/OAuth2RedirectHandler.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import UserInquiry from "./pages/UserInquiry.jsx";
import GamePage from "./pages/game/GamePage.jsx";
import NotFound from "./pages/NotFound.jsx";
import Loading from "./components/common/Loading.jsx";

function App() {
  const audioRef = useRef(null);
  const [isMuted, setIsMuted] = useState(true);
  // 기능 수정을 위해 필요한 상태 선언
  const [isInitialized, setIsInitialized] = useState(false);
  // 권한 확인 - 경로로 admin 페이지로 들어오려고 하면 차단
  const ProtectedAdminRoute = ({ children }) => {
    const userRole = sessionStorage.getItem("role");
    if (userRole !== "ADMIN") {
      alert("관리자만 접근 가능한 페이지입니다! ⛔");
      return <Navigate to="/home" replace />;
    }
    return children;
  };

  // 사용자가 사이트 어디든 처음 클릭하면 재생 시작 (브라우저 정책 대응)
  useEffect(() => {
    const handleFirstInteraction = () => {
      if (audioRef.current) {
        audioRef.current.play().catch((e) => console.log("재생 실패:", e));
        setIsMuted(false);
      }
      // 한 번 실행 후 이벤트 제거
      window.removeEventListener("click", handleFirstInteraction);
    };

    window.addEventListener("click", handleFirstInteraction);
    return () => window.removeEventListener("click", handleFirstInteraction);
  }, []);

  // 초기화 완료 처리 (백업 로직 삭제로 인해 바로 true)
  useEffect(() => {
    // [Session Only Policy] 로컬 스토리지에 남아있는 토큰 정보 삭제 (보안 강화)
    localStorage.removeItem("token");
    localStorage.removeItem("nickname");
    localStorage.removeItem("bell");
    localStorage.removeItem("level");

    setIsInitialized(true);
  }, []);

  // 초기화가 완료되기 전에는 렌더링을 잠시 멈춤 (에러 방지)
  if (!isInitialized) return null;

  if (!isInitialized) return <Loading />;

  return (
    <Router>
      <Routes>
        <Route path="/home" element={<Home />} />
        <Route path="/" element={<Login />} />
        <Route path="/config" element={<Config />} />
        <Route path="/store" element={<Store />} />
        <Route path="/rooms/:roomId" element={<Room />} />
        <Route path="/rooms/:roomId/select" element={<CharacterSelect />} />
        <Route path="/room-list" element={<RoomList />} />
        <Route path="/join" element={<Join />} />
        <Route path="/mypage" element={<MyPage />} />
        <Route path="/oauth2/redirect" element={<OAuth2RedirectHandler />} />
        <Route
          path="/admin"
          element={
            <ProtectedAdminRoute>
              {" "}
              <AdminPage />{" "}
            </ProtectedAdminRoute>
          }
        />
        <Route path="/games/:roomId" element={<GamePage />} />
        <Route path="/user-inquiry" element={<UserInquiry />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
