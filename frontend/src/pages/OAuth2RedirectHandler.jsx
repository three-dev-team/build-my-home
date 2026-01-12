import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function OAuth2RedirectHandler() {
    const navigate = useNavigate();
    const location = useLocation();
    const ranRef = useRef(false); // ✅ 2번 실행 방지

    useEffect(() => {
        if (ranRef.current) return;
        ranRef.current = true;

        const params = new URLSearchParams(location.search);
        const token = params.get("token");
        const nickname = params.get("nickname");
        const bell = params.get("bell");
        const level = params.get("level");

        if (token) {
            sessionStorage.setItem("token", token);
            sessionStorage.setItem("nickname", nickname || "주민");
            sessionStorage.setItem("bell", bell ?? "0");
            sessionStorage.setItem("level", level ?? "1");

            window.alert(`${sessionStorage.getItem("nickname")}님, 소셜 로그인 성공! 🍃`);

            navigate("/home", { replace: true });
            return;
        }

        window.alert("소셜 로그인에 실패했습니다. 다시 시도해주세요.");
        navigate("/", { replace: true });
    }, [location.search, navigate]);

    return (
        <div className="w-full h-screen flex items-center justify-center bg-[#fdf6e3]">
            <div className="text-2xl font-black text-[#8b5a2b] animate-bounce">
                주민 등록증을 확인 중입니다... 🍃
            </div>
        </div>
    );
}
