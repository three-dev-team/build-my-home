import React, { useState, useEffect, useRef } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login";
import Config from "./pages/Config.jsx";
import Store from "./pages/Store.jsx";
import Loading from "./pages/Loading.jsx";
import Room from "./pages/Room.jsx";
import Join from "./pages/Join.jsx";
import MyPage from "./pages/MyPage.jsx";
import OAuth2RedirectHandler from "./pages/OAuth2RedirectHandler";

function App() {
    const audioRef = useRef(null);
    const [isMuted, setIsMuted] = useState(true);

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
    return (
        <Router>
            <Routes>
                <Route path="/home" element={<Home />} />
                <Route path="/" element={<Login />} />
                <Route path="/config" element={<Config />} />
                <Route path="/store" element={<Store />} />
                <Route path="/loading" element={<Loading />} />
                <Route path="/room/:roomId" element={<Room />} />
                <Route path="/join" element={<Join />} />
                <Route path="/myPage" element={<MyPage />} />
                <Route path="/oauth2/redirect" element={<OAuth2RedirectHandler />} />
            </Routes>
        </Router>
    );
}

export default App;