import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function MyPage() {
    // 1. 초기값 설정: 세션스토리지에서 즉시 가져와 '본인 이름'이 바로 보이게 함
    const [nickname, setNickname] = useState(sessionStorage.getItem("nickname") || "");
    const [email, setEmail] = useState("");
    const [bell, setBell] = useState(Number(sessionStorage.getItem("bell")) || 0);
    const [level, setLevel] = useState(Number(sessionStorage.getItem("level")) || 1);
    const [profileImg, setProfileImg] = useState("/images/default_profile.png"); // 선언 추가

    const navigate = useNavigate();
    const API_BASE_URL = "http://localhost:8088/api/member";

    useEffect(() => {
        const fetchUserData = async () => {
            const token = sessionStorage.getItem("token");
            if (!token) {
                navigate("/login");
                return;
            }

            try {
                const response = await axios.get(`${API_BASE_URL}/me`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const { email, nickname, bell, level, profileImageUrl } = response.data;

                setEmail(email);
                setNickname(nickname);
                setBell(bell);
                setLevel(level);
                if (profileImageUrl) setProfileImg(profileImageUrl);

                // 세션스토리지 업데이트 (자동 로그아웃을 위해 sessionStorage 사용)
                sessionStorage.setItem("nickname", nickname);
                sessionStorage.setItem("bell", bell);
                sessionStorage.setItem("level", level);
            } catch (error) {
                console.error("데이터 로드 실패", error);
            }
        };
        fetchUserData();
    }, [navigate]);

    const handleUpdateNickname = async () => {
        try {
            const token = sessionStorage.getItem("token");
            await axios.put(`${API_BASE_URL}/nickname`, { nickname }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            sessionStorage.setItem("nickname", nickname);
            alert("닉네임이 성공적으로 변경되었습니다! ✨");
        } catch (error) {
            alert("변경에 실패했습니다. 중복된 닉네임인지 확인해주세요.");
        }
    };

    const handleLogout = () => {
        sessionStorage.clear();
        alert("다음에 또 만나요! 🍃");
        navigate("/");
    };

    return (
        <div className="relative w-full h-screen bg-[#fdf6e3] flex items-center justify-center overflow-hidden"
             style={{ backgroundImage: "url('/images/background.jpg')", backgroundSize: 'cover' }}>

            {/* 설정 버튼 */}
            <button className="absolute top-6 right-6 w-14 h-14 bg-[#d1c4a9] border-[4px] border-[#8b5a2b] rounded-full shadow-lg flex items-center justify-center hover:rotate-45 transition-transform z-50">
                <span className="text-2xl">⚙️</span>
            </button>

            <div className="relative w-[90%] max-w-[750px] bg-[#fdf6e3] p-8 md:p-12 rounded-[50px] border-[8px] border-[#8b5a2b] shadow-[15px_15px_0px_rgba(139,90,43,0.15)]">

                {/* 상단 타이틀 */}
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#8b5a2b] px-10 py-2 rounded-[25px] border-[4px] border-white shadow-md whitespace-nowrap">
                    <h1 className="text-2xl font-black text-white">마이 페이지</h1>
                </div>

                <div className="flex flex-col md:flex-row gap-8 mt-4">
                    {/* 왼쪽: 프로필 */}
                    <div className="flex flex-col items-center gap-4 min-w-[200px]">
                        <div className="w-40 h-40 bg-[#efe7d1] border-[5px] border-[#bc8a5f] rounded-[35px] overflow-hidden shadow-inner flex items-center justify-center">
                            <img src={profileImg} alt="프로필" className="w-full h-full object-cover" />
                        </div>
                        <div className="bg-white/80 px-4 py-2 rounded-2xl border-2 border-[#bc8a5f] w-full text-center">
                            <p className="text-[#8b5a2b] font-black text-sm">Lv. {level}</p>
                            <p className="text-[#5d4037] font-bold text-xs">{bell.toLocaleString()} Bell 💰</p>
                        </div>
                    </div>

                    {/* 오른쪽: 입력폼 */}
                    <div className="flex-1 space-y-4">
                        <div className="flex flex-col gap-1">
                            <label className="text-[#8b5a2b] font-black text-sm ml-1">닉네임</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={nickname}
                                    onChange={(e) => setNickname(e.target.value)}
                                    className="flex-1 bg-[#efe7d1] border-none rounded-2xl py-3 px-4 text-[#5d4037] font-bold outline-none focus:ring-4 ring-[#8b5a2b]/20 transition-all"
                                />
                                <button onClick={handleUpdateNickname} className="bg-[#bc8a5f] text-white px-4 rounded-xl font-bold text-sm shadow-md hover:brightness-110 active:scale-95 transition-all whitespace-nowrap">변경</button>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-[#8b5a2b] font-black text-sm ml-1">이메일</label>
                            <input type="text" value={email} readOnly className="w-full bg-[#e5ddd0] border-none rounded-2xl py-3 px-4 text-[#8d7b6d] font-bold cursor-not-allowed" />
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-[#8b5a2b] font-black text-sm ml-1">주민 소개</label>
                            <div className="w-full bg-[#efe7d1] rounded-2xl py-3 px-4 text-[#5d4037] font-bold h-16 shadow-inner italic text-xs">
                                "멋진 집을 짓고 싶어요! 🍃"
                            </div>
                        </div>
                    </div>
                </div>

                {/* 하단 버튼 */}
                <div className="mt-8 flex justify-center gap-3">
                    <button onClick={handleLogout} className="bg-[#e57373] text-white px-6 py-2 rounded-full font-black shadow-md hover:brightness-110 active:scale-95 transition-all">로그아웃</button>
                    <button onClick={() => navigate(-1)} className="bg-[#8b5a2b] text-[#fdf6e3] px-10 py-2 rounded-full font-black shadow-md hover:brightness-110 active:scale-95 transition-all">닫기</button>
                </div>
            </div>
        </div>
    );
}