import React, { useState, useEffect, useRef } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
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
import MainBoardPage from "./pages/game/MainBoardPage.jsx";
import UserInquiry from "./pages/UserInquiry.jsx"

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

    useEffect(() => {
        // 초기 로드 시 즉시 복구 (useEffect 안에서 가장 먼저 실행)
        const backupToken = localStorage.getItem("token");
        if (backupToken && !sessionStorage.getItem("token")) {
            sessionStorage.setItem("token", backupToken);
            sessionStorage.setItem("nickname", localStorage.getItem("nickname") || "");
            sessionStorage.setItem("bell", localStorage.getItem("bell") || "0");
            sessionStorage.setItem("level", localStorage.getItem("level") || "1");
        }

        // 복구가 끝났음을 알림
        setIsInitialized(true);
    }, []);

    // 사용자가 사이트 어디든 처음 클릭하면 재생 시작 (브라우저 정책 대응)
    useEffect(() => {
        const handleFirstInteraction = () => {
            if (audioRef.current) {
                audioRef.current.play().catch(e => console.log("재생 실패:", e));
                setIsMuted(false);
            }
            // 한 번 실행 후 이벤트 제거
            window.removeEventListener("click", handleFirstInteraction);
        };

        window.addEventListener("click", handleFirstInteraction);
        return () => window.removeEventListener("click", handleFirstInteraction);
    }, []);

    useEffect(() => {
        // 1. 페이지 로드 시: localStorage에 백업된 정보가 있다면 sessionStorage로 복구
        // (Login.js가 sessionStorage를 사용하므로 호환성을 위해 복구해줌)
        const backupToken = localStorage.getItem("token");
        if (backupToken && !sessionStorage.getItem("token")) {
            sessionStorage.setItem("token", backupToken);
            sessionStorage.setItem("nickname", localStorage.getItem("nickname"));
            sessionStorage.setItem("level", localStorage.getItem("level"));
        }

        // 2. 데이터 동기화: sessionStorage에 값이 생기면 즉시 localStorage에도 복사 (백업)
        const syncStorage = setInterval(() => {
            const token = sessionStorage.getItem("token");
            if (token) {
                localStorage.setItem("token", token);
                localStorage.setItem("nickname", sessionStorage.getItem("nickname"));
                localStorage.setItem("level", sessionStorage.getItem("level"));
            }
        }, 1000);

        return () => clearInterval(syncStorage);
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
                <Route path="/rooms/:roomId/select" element={<CharacterSelect/>}/>
                <Route path="/room-list" element={<RoomList />} />
                <Route path="/join" element={<Join />} />
                <Route path="/mypage" element={<MyPage />} />
                <Route path="/oauth2/redirect" element={<OAuth2RedirectHandler />} />
                <Route path="/admin" element={<ProtectedAdminRoute> <AdminPage /> </ProtectedAdminRoute>} />
                <Route path="/game/:roomId" element={<MainBoardPage />} />
                <Route path="/user-inquiry" element={<UserInquiry />} />
            </Routes>
        </Router>
    );
}

export default App;