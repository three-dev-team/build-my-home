import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function MyPage() {
    // 탭 상태 관리: 'settings' (환경설정), 'account' (마이페이지), 'inquiry' (문의등록)
    const [activeTab, setActiveTab] = useState("account");

    // 데이터 상태 관리
    const [nickname, setNickname] = useState(sessionStorage.getItem("nickname") || "");
    const [email, setEmail] = useState("");
    const [bell, setBell] = useState(Number(sessionStorage.getItem("bell")) || 0);
    const [level, setLevel] = useState(Number(sessionStorage.getItem("level")) || 1);
    const [profileImg, setProfileImg] = useState("/images/default_profile.png");

    // 설정 관련 상태 (환경설정 탭)
    const [sfxVolume, setSfxVolume] = useState(50);
    const [bgmVolume, setBgmVolume] = useState(70);

    // 문의 관련 상태 (문의등록 탭)
    const [inquiryTitle, setInquiryTitle] = useState("");
    const [inquiryContent, setInquiryContent] = useState("");

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

                sessionStorage.setItem("nickname", nickname);
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

    const handleInquirySubmit = () => {
        alert("문의가 접수되었습니다. 곧 답변 드릴게요! 📮");
        setInquiryTitle("");
        setInquiryContent("");
    };

    return (
        <div className="relative w-full h-screen bg-[#fdf6e3] flex items-center justify-center overflow-hidden"
             style={{ backgroundImage: "url('/images/background.jpg')", backgroundSize: 'cover' }}>

            {/* 메인 컨테이너 (와이어프레임 회색 박스 형태 반영) */}
            <div className="relative w-[90%] max-w-[850px] bg-[#d1d1d1] p-10 rounded-[40px] border-[6px] border-[#8b5a2b] shadow-2xl">

                <div className="flex gap-6 min-h-[400px]">

                    {/* 왼쪽: 탭 메뉴 (와이어프레임 좌측 버튼 세로 배열) */}
                    <div className="flex flex-col gap-3 min-w-[120px]">
                        {[
                            { id: "settings", label: "설정" },
                            { id: "account", label: "계정" },
                            { id: "inquiry", label: "문의" }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`py-3 px-6 rounded-2xl font-black text-lg transition-all shadow-md ${
                                    activeTab === tab.id
                                        ? "bg-[#e2f0a1] text-[#5d4037] border-4 border-[#8b5a2b]"
                                        : "bg-white text-[#8b5a2b] border-4 border-transparent hover:bg-[#efe7d1]"
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* 오른쪽: 콘텐츠 영역 (와이어프레임 우측 흰색 박스) */}
                    <div className="flex-1 bg-white rounded-[30px] p-8 border-4 border-[#8b5a2b]/20 shadow-inner overflow-y-auto">

                        {/* 1. 환경설정 탭 */}
                        {activeTab === "settings" && (
                            <div className="space-y-8 flex flex-col justify-center h-full">
                                <div className="flex items-center gap-6">
                                    <span className="font-black text-[#8b5a2b] w-20 text-lg">효과음</span>
                                    <span className="text-xl">🔈</span>
                                    <input type="range" value={sfxVolume} onChange={(e) => setSfxVolume(e.target.value)} className="flex-1 accent-[#8b5a2b]" />
                                    <span className="text-xl">🔊</span>
                                </div>
                                <div className="flex items-center gap-6">
                                    <span className="font-black text-[#8b5a2b] w-20 text-lg">배경음</span>
                                    <span className="text-xl">🔈</span>
                                    <input type="range" value={bgmVolume} onChange={(e) => setBgmVolume(e.target.value)} className="flex-1 accent-[#8b5a2b]" />
                                    <span className="text-xl">🔊</span>
                                </div>
                            </div>
                        )}

                        {/* 2. 마이페이지(계정) 탭 */}
                        {activeTab === "account" && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-16 h-16 bg-[#efe7d1] rounded-2xl border-2 border-[#bc8a5f] flex items-center justify-center overflow-hidden">
                                        <img src={profileImg} alt="P" className="w-full h-full object-cover" />
                                    </div>
                                    <div>
                                        <p className="text-[#8b5a2b] font-black">Lv. {level}</p>
                                        <p className="text-[#5d4037] text-sm font-bold">{bell.toLocaleString()} Bell 💰</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black text-[#8b5a2b]">닉네임</label>
                                    <div className="flex gap-2">
                                        <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} className="flex-1 bg-[#f0f0f0] rounded-xl p-3 font-bold text-[#5d4037] border-none outline-none" />
                                        <button onClick={handleUpdateNickname} className="bg-[#bc8a5f] text-white px-4 rounded-xl font-bold text-sm">변경</button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black text-[#8b5a2b]">이메일</label>
                                    <input type="text" value={email} readOnly className="w-full bg-[#f0f0f0] rounded-xl p-3 font-bold text-[#8d7b6d] cursor-not-allowed" />
                                </div>

                                <div className="grid grid-cols-2 gap-3 mt-6">
                                    <button className="bg-[#efe7d1] py-3 rounded-xl font-black text-[#8b5a2b] shadow-sm hover:bg-[#e5ddd0]">내 문의 내역</button>
                                    <button className="bg-[#efe7d1] py-3 rounded-xl font-black text-[#8b5a2b] shadow-sm hover:bg-[#e5ddd0]">공지사항</button>
                                    <button onClick={handleLogout} className="bg-[#ffb3b3] py-3 rounded-xl font-black text-[#d32f2f] shadow-sm col-span-2 mt-2">로그아웃</button>
                                </div>
                            </div>
                        )}

                        {/* 3. 문의등록 탭 */}
                        {activeTab === "inquiry" && (
                            <div className="space-y-4 h-full flex flex-col">
                                <input
                                    type="text"
                                    placeholder="제목"
                                    value={inquiryTitle}
                                    onChange={(e) => setInquiryTitle(e.target.value)}
                                    className="w-full bg-[#f0f0f0] rounded-xl p-3 font-bold text-[#5d4037] outline-none"
                                />
                                <textarea
                                    placeholder="내용을 입력해주세요."
                                    value={inquiryContent}
                                    onChange={(e) => setInquiryContent(e.target.value)}
                                    className="w-full flex-1 bg-[#f0f0f0] rounded-xl p-4 font-bold text-[#5d4037] outline-none resize-none"
                                />
                                <button onClick={handleInquirySubmit} className="w-full bg-[#bc8a5f] text-white py-3 rounded-xl font-black text-lg shadow-md hover:brightness-110">제출</button>
                            </div>
                        )}
                    </div>
                </div>

                {/* 하단 공통 닫기 버튼 */}
                <div className="mt-8 flex justify-center">
                    <button
                        onClick={() => navigate(-1)}
                        className="bg-white/50 text-[#5d4037] px-16 py-2 rounded-full font-black text-lg border-2 border-[#8b5a2b]/30 hover:bg-white transition-all"
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
}