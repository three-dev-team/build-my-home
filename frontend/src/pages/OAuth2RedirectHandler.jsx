import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function OAuth2RedirectHandler() {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        // 1. URL에서 쿼리 파라미터를 추출합니다.
        const params = new URLSearchParams(location.search);
        const token = params.get("token");
        const nickname = params.get("nickname");
        const bell = params.get("bell");
        const level = params.get("level");

        if (token) {
            // 2. 백엔드에서 받은 정보를 세션 스토리지에 저장합니다.
            sessionStorage.setItem("token", token);
            sessionStorage.setItem("nickname", decodeURIComponent(nickname)); // 한글 깨짐 방지
            sessionStorage.setItem("bell", bell);
            sessionStorage.setItem("level", level);

            alert(`${sessionStorage.getItem("nickname")}님, 소셜 로그인 성공! 🍃`);

            // 3. 로그인 성공 후 홈으로 이동합니다.
            navigate("/home");
        } else {
            // 토큰이 없다면 로그인 실패로 간주합니다.
            alert("소셜 로그인에 실패했습니다. 다시 시도해주세요.");
            navigate("/");
        }
    }, [location, navigate]);

    return (
        <div className="w-full h-screen flex items-center justify-center bg-[#fdf6e3]">
            <div className="text-2xl font-black text-[#8b5a2b] animate-bounce">
                주민 등록증을 확인 중입니다... 🍃
            </div>
        </div>
    );
}