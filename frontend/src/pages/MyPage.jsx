import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function MyPage() {
    const navigate = useNavigate();
    const API_BASE_URL = "http://localhost:8088/api/member";
    const nicknameInputRef = useRef(null);

    const [activeTab, setActiveTab] = useState("account");
    const [userData, setUserData] = useState({
        nickname: "", email: "", bell: 0, level: 1, role: "MEMBER"
    });
    const [isLoading, setIsLoading] = useState(true);

    // 설정 및 문의 상태 관리
    const [bgmVolume, setBgmVolume] = useState(Number(localStorage.getItem("bgmVolume")) || 50);
    const [sfxVolume, setSfxVolume] = useState(Number(localStorage.getItem("sfxVolume")) || 50);
    const [inquiryTitle, setInquiryTitle] = useState("");
    const [inquiryContent, setInquiryContent] = useState("");

    // 닉네임 모달 상태
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editNickname, setEditNickname] = useState("");
    const [isConfirmStep, setIsConfirmStep] = useState(false);

    // 회원 탈퇴 모달 상태
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
    const [isWithdrawConfirmStep, setIsWithdrawConfirmStep] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            const token = sessionStorage.getItem("token");
            if (!token) return navigate("/");
            try {
                const res = await axios.get(`${API_BASE_URL}/me`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setUserData(res.data);
                setEditNickname(res.data.nickname);
                sessionStorage.setItem("role", res.data.role);
                setIsLoading(false);
            } catch (e) {
                console.error(e);
                setIsLoading(false);
                if (e.response?.status === 401) navigate("/");
            }
        };
        fetchData();
    }, [navigate]);

    // 설정 변경 핸들러
    const handleVolumeChange = (type, value) => {
        if (type === "BGM") {
            setBgmVolume(value);
            localStorage.setItem("bgmVolume", value);
        } else {
            setSfxVolume(value);
            localStorage.setItem("sfxVolume", value);
        }
    };

    // 문의하기 접수 핸들러
    const handleInquirySubmit = async () => {
        if (!inquiryTitle.trim() || !inquiryContent.trim()) {
            alert("제목과 내용을 모두 입력해주세요! 📮");
            return;
        }
        try {
            const token = sessionStorage.getItem("token");
            await axios.post(`${API_BASE_URL}/inquiry`,
                {
                    title: inquiryTitle,
                    content: inquiryContent
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            alert("주민님의 문의가 정상적으로 접수되었습니다! 🍃");
            setInquiryTitle("");
            setInquiryContent("");
        } catch (e) {
            console.error(e);
            alert("문의 접수에 실패했습니다. 잠시 후 다시 시도해주세요.");
        }
    };

    const handleLogout = () => {
        if (window.confirm("로그아웃 하시겠습니까? 🍃")) {
            sessionStorage.clear();
            navigate("/");
        }
    };

    // 회원 탈퇴 처리
    const handleWithdraw = async () => {
        try {
            const token = sessionStorage.getItem("token");
            await axios.delete(`${API_BASE_URL}/withdraw`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert("그동안 마이홈과 함께해주셔서 감사합니다. 🕊️");
            sessionStorage.clear();
            navigate("/");
        } catch (e) {
            console.error(e);
            alert("탈퇴 처리 중 오류가 발생했습니다.");
            setIsWithdrawModalOpen(false);
        }
    };

    // --- 수정된 부분: 닉네임 변경 성공 시 로그아웃 처리 ---
    const handleSaveNickname = async () => {
        try {
            const token = sessionStorage.getItem("token");
            await axios.put(`${API_BASE_URL}/nickname`,
                { nickname: editNickname },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            // 1. 사용자에게 알림
            alert("닉네임이 성공적으로 변경되었습니다! ✨\n보안을 위해 다시 로그인해 주세요.");

            // 2. 세션 정보 삭제 (로그아웃)
            sessionStorage.clear();

            // 3. 메인 또는 로그인 페이지로 이동
            navigate("/");

        } catch (e) {
            if (e.response && e.response.status === 409) {
                alert("이미 사용 중인 닉네임입니다. 다른 이름을 입력해주세요! 😢");
                setEditNickname("");
                setIsConfirmStep(false);
                setTimeout(() => nicknameInputRef.current?.focus(), 100);
            } else {
                alert("변경에 실패했습니다. 다시 시도해주세요.");
            }
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setIsConfirmStep(false);
        setEditNickname(userData.nickname);
    };

    const closeWithdrawModal = () => {
        setIsWithdrawModalOpen(false);
        setIsWithdrawConfirmStep(false);
    };

    if (isLoading) return (
        <div className="h-screen flex items-center justify-center bg-[#FFFCEF]">
            <div className="text-center">
                <div className="text-4xl animate-bounce mb-4">🍃</div>
                <div className="text-xl font-black text-[#8b5a2b]">주민 정보를 불러오는 중...</div>
            </div>
        </div>
    );

    return (
        <div className="relative w-full h-screen flex items-center justify-center overflow-hidden font-sans">
            <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: "url('/images/background.jpg')" }}
            />

            {/* --- 닉네임 변경 모달 --- */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-[#FFFCEF] w-[380px] p-8 rounded-[40px] border-[6px] border-[#8b5a2b] shadow-2xl">
                        {!isConfirmStep ? (
                            <div className="space-y-6 text-center">
                                <h3 className="text-2xl font-black text-[#8b5a2b]">이름 변경하기 🍃</h3>
                                <input
                                    ref={nicknameInputRef}
                                    type="text"
                                    value={editNickname}
                                    onChange={(e) => setEditNickname(e.target.value)}
                                    className="w-full p-4 rounded-2xl bg-white border-4 border-[#efe7d1] text-[#5d4037] font-bold text-center outline-none focus:border-[#bc8a5f]"
                                    placeholder="새 이름을 입력하세요"
                                />
                                <div className="flex gap-3">
                                    <button onClick={closeModal} className="flex-1 py-3 bg-[#DED0A6] text-[#5d4037] rounded-2xl font-bold">취소</button>
                                    <button onClick={() => setIsConfirmStep(true)} className="flex-1 py-3 bg-[#8b5a2b] text-white rounded-2xl font-bold">변경</button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6 text-center">
                                <h3 className="text-2xl font-black text-[#8b5a2b]">정말 바꿀까요?</h3>
                                <p className="text-[#5d4037] font-bold text-lg">
                                    <span className="text-[#bc8a5f]">"{editNickname}"</span>(으)로<br/>결정하시겠습니까?
                                </p>
                                <p className="text-xs text-[#8b5a2b] font-bold">* 변경 시 다시 로그인해야 합니다.</p>
                                <div className="flex gap-3">
                                    <button onClick={() => setIsConfirmStep(false)} className="flex-1 py-3 bg-[#DED0A6] text-[#5d4037] rounded-2xl font-bold">아니오</button>
                                    <button onClick={handleSaveNickname} className="flex-1 py-3 bg-[#e2f0a1] border-4 border-[#8b5a2b] rounded-2xl font-black text-[#8b5a2b]">네!</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* --- 회원 탈퇴 모달 --- */}
            {isWithdrawModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-[#FFFCEF] w-[380px] p-8 rounded-[40px] border-[6px] border-[#D32F2F] shadow-2xl animate-in zoom-in-95">
                        {!isWithdrawConfirmStep ? (
                            <div className="space-y-6 text-center">
                                <h3 className="text-2xl font-black text-[#D32F2F]">마이홈을 떠나시나요? 😢</h3>
                                <p className="text-[#5d4037] font-bold">탈퇴 시 모든 게임 데이터와<br/>벨(Bell)이 영구 삭제됩니다.</p>
                                <div className="flex gap-3">
                                    <button onClick={closeWithdrawModal} className="flex-1 py-3 bg-gray-200 rounded-2xl font-bold">취소</button>
                                    <button onClick={() => setIsWithdrawConfirmStep(true)} className="flex-1 py-3 bg-[#D32F2F] text-white rounded-2xl font-bold">탈퇴하기</button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6 text-center">
                                <h3 className="text-2xl font-black text-[#D32F2F]">마지막 확인!</h3>
                                <p className="text-[#5d4037] font-bold text-lg">정말로 모든 정보를 삭제하고<br/>주민 등록을 해지할까요?</p>
                                <div className="flex gap-3">
                                    <button onClick={() => setIsWithdrawConfirmStep(false)} className="flex-1 py-3 bg-gray-200 rounded-2xl font-bold">아니오</button>
                                    <button onClick={handleWithdraw} className="flex-1 py-3 bg-[#FFB3B3] border-4 border-[#D32F2F] rounded-2xl font-black text-[#D32F2F]">네, 탈퇴합니다.</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="relative z-10 w-[95%] max-w-[850px] bg-[#efe7d1] p-8 rounded-[50px] border-[8px] border-[#8b5a2b] shadow-[15px_15px_0px_rgba(139,90,43,0.15)]">
                <div className="flex flex-row gap-6">
                    <div className="flex flex-col gap-3 min-w-[150px]">
                        {[
                            { id: "account", label: "계정 정보" },
                            { id: "settings", label: "설정" },
                            { id: "inquiry", label: "문의하기" },
                            ...(userData.role?.includes("ADMIN") ? [{ id: "admin", label: "관리자" }] : [])
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    if (tab.id === "admin") { navigate("/admin"); }
                                    else { setActiveTab(tab.id); }
                                }}
                                className={`py-4 px-6 rounded-[25px] font-black text-lg transition-all shadow-sm ${
                                    activeTab === tab.id
                                        ? "bg-[#e2f0a1] text-[#8b5a2b] border-[4px] border-[#8b5a2b] translate-x-2"
                                        : "bg-white text-[#8b5a2b] hover:bg-[#FFFCEF]"
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex-1 bg-[#FFFCEF] rounded-[40px] p-8 border-4 border-[#8b5a2b]/20 shadow-inner h-[450px] overflow-y-auto">
                        {activeTab === "account" && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center bg-white p-6 rounded-[30px] border-2 border-[#DED0A6]">
                                    <div className="space-y-1">
                                        <p className="text-3xl font-black text-[#8b5a2b]">Lv. {userData.level}</p>
                                        <p className="font-bold text-[#5d4037] text-lg">{userData.bell.toLocaleString()} Bell 💰</p>
                                    </div>
                                    <span className="px-4 py-1 bg-[#8b5a2b] text-white rounded-full text-xs font-bold uppercase">{userData.role}</span>
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-black text-[#8b5a2b] ml-2">주민 이름</label>
                                        <div className="flex gap-3">
                                            <input type="text" value={userData.nickname} readOnly className="flex-1 bg-[#F4F0D7] rounded-2xl p-4 font-bold text-[#8d7b6d] outline-none cursor-default border-2 border-transparent" />
                                            <button onClick={() => setIsModalOpen(true)} className="bg-[#bc8a5f] text-white px-8 rounded-2xl font-black hover:bg-[#8b5a2b] shadow-md transition-all active:scale-95">변경</button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-black text-[#8b5a2b] ml-2">연결된 이메일</label>
                                        <input type="text" value={userData.email || "정보 없음"} readOnly className="w-full bg-[#F4F0D7] rounded-2xl p-4 font-bold text-[#8d7b6d] outline-none cursor-default" />
                                    </div>
                                </div>
                                <div className="flex gap-3 mt-4 pt-6 border-t-2 border-[#DED0A6]">
                                    <button
                                        onClick={handleLogout}
                                        className="flex-1 bg-[#e2f0a1] py-4 rounded-[25px] font-black text-[#5d7a22] shadow-sm hover:bg-[#d4e68d] transition-all"
                                    >
                                        로그아웃
                                    </button>

                                    <button
                                        onClick={() => {
                                            setIsWithdrawModalOpen(true);
                                            setIsWithdrawConfirmStep(false);
                                        }}
                                        className="flex-1 bg-[#FFB3B3] py-4 rounded-[25px] font-black text-[#D32F2F] shadow-sm hover:bg-[#FF9999] transition-all text-sm"
                                    >
                                        주민 탈퇴
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === "settings" && (
                            <div className="space-y-10 py-4">
                                <h3 className="text-2xl font-black text-[#8b5a2b] border-b-2 border-[#DED0A6] pb-2">환경 설정 ⚙️</h3>
                                <div className="space-y-8">
                                    <div className="space-y-3">
                                        <div className="flex justify-between font-black text-[#8b5a2b]"><span>배경음악 (BGM)</span><span>{bgmVolume}%</span></div>
                                        <input type="range" min="0" max="100" value={bgmVolume} onChange={(e) => handleVolumeChange("BGM", e.target.value)} className="w-full h-4 bg-[#F4F0D7] rounded-lg appearance-none cursor-pointer accent-[#8b5a2b]" />
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between font-black text-[#8b5a2b]"><span>효과음 (SFX)</span><span>{sfxVolume}%</span></div>
                                        <input type="range" min="0" max="100" value={sfxVolume} onChange={(e) => handleVolumeChange("SFX", e.target.value)} className="w-full h-4 bg-[#F4F0D7] rounded-lg appearance-none cursor-pointer accent-[#8b5a2b]" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === "inquiry" && (
                            <div className="space-y-6 py-4 flex flex-col h-full">
                                <h3 className="text-2xl font-black text-[#8b5a2b] border-b-2 border-[#DED0A6] pb-2">도움센터 📮</h3>
                                <div className="space-y-4 flex-1 flex flex-col">
                                    <input type="text" placeholder="문의 제목을 입력하세요." value={inquiryTitle} onChange={(e) => setInquiryTitle(e.target.value)} className="w-full p-4 rounded-2xl bg-white border-2 border-[#DED0A6] text-[#5d4037] font-bold outline-none focus:border-[#bc8a5f]" />
                                    <textarea placeholder="문의 내용을 상세히 적어주시면 확인 후 답변 드릴게요! 🍃" value={inquiryContent} onChange={(e) => setInquiryContent(e.target.value)} className="w-full flex-1 p-4 rounded-2xl bg-white border-2 border-[#DED0A6] text-[#5d4037] font-bold outline-none focus:border-[#bc8a5f] resize-none" />
                                    <button onClick={handleInquirySubmit} className="w-full bg-[#bc8a5f] text-white py-4 rounded-2xl font-black text-lg shadow-md hover:bg-[#8b5a2b] transition-all">문의 제출하기</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="mt-8 flex justify-center">
                    <button onClick={() => navigate("/home")} className="bg-white/90 hover:bg-white text-[#5d4037] px-24 py-3 rounded-full font-black text-xl border-4 border-[#8b5a2b]/30 shadow-md transition-all active:scale-95">마이홈으로 돌아가기</button>
                </div>
            </div>
        </div>
    );
}