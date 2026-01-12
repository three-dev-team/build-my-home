import React, { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

// --- 소셜 아이콘 컴포넌트 ---
const GoogleIcon = () => (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g filter="url(#filter0_d_1_2)">
            <path d="M28 50C40.1503 50 50 40.1503 50 28C50 15.8497 40.1503 6 28 6C15.8497 6 6 15.8497 6 28C6 40.1503 15.8497 50 28 50Z" fill="#FFFCEF" stroke="#DED0A6" strokeWidth="3"/>
            <path d="M28 13C29.9 13 31.7 13.7 33 14.9L38.4 9.5C35.6 6.9 32 5.3 28 5.3C19.3 5.3 11.9 10.8 9.2 18.5L15.5 23.4C17.4 17.4 22.3 13 28 13Z" fill="#EA4335"/>
            <path d="M28 43C22.3 43 17.4 38.6 15.5 32.6L9.2 37.5C11.9 45.2 19.3 50.7 28 50.7C34.2 50.7 39.4 48.7 43.2 45.2L37.3 40.6C35.3 42 32.4 43 28 43Z" fill="#34A853"/>
            <path d="M15.5 32.6C15 31.1 14.7 29.6 14.7 28C14.7 26.4 15 24.9 15.5 23.4L9.2 18.5C8.1 21.4 7.5 24.6 7.5 28C7.5 31.4 8.1 34.6 9.2 37.5L15.5 32.6Z" fill="#FBBC05"/>
            <path d="M50 28C50 26.4 49.8 24.8 49.4 23.3H28V32H40.7C40.2 34.9 38.3 38.3 37.3 40.6L43.2 45.2C47 41.6 50 35.6 50 28Z" fill="#4285F4"/>
            <path d="M28 4C14.7452 4 4 14.7452 4 28C4 41.2548 14.7452 52 28 52C41.2548 52 52 41.2548 52 28C52 14.7452 41.2548 4 28 4ZM28 49.3333C16.2176 49.3333 6.66667 39.7824 6.66667 28C6.66667 16.2176 16.2176 6.66667 28 6.66667C39.7824 6.66667 49.3333 16.2176 49.3333 28C49.3333 39.7824 39.7824 49.3333 28 49.3333Z" fill="#9E8F5C" opacity="0.3"/>
        </g>
    </svg>
);

const GithubIcon = () => (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g filter="url(#filter0_d_1_3)">
            <path d="M28 50C40.1503 50 50 40.1503 50 28C50 15.8497 40.1503 6 28 6C15.8497 6 6 15.8497 6 28C6 40.1503 15.8497 50 28 50Z" fill="#F4F0D7" stroke="#DED0A6" strokeWidth="3"/>
            <path fillRule="evenodd" clipRule="evenodd" d="M28 5.3C15.5 5.3 5.3 15.5 5.3 28C5.3 38 11.8 46.5 20.8 49.5C21.9 49.7 22.3 49 22.3 48.4C22.3 47.9 22.3 46.5 22.3 44.7C16 46 14.7 41.7 14.7 41.7C13.7 39.1 12.2 38.4 12.2 38.4C10.1 37 12.3 37 12.3 37C14.6 37.2 15.8 39.4 15.8 39.4C17.8 42.9 21.1 41.9 22.4 41.3C22.6 39.8 23.2 38.8 23.9 38.2C18.9 37.6 13.6 35.7 13.6 27.2C13.6 24.8 14.5 22.8 16 21.1C15.8 20.5 15 18.2 16.2 15.1C16.2 15.1 18.1 14.5 22.5 17.5C24.3 17 26.2 16.7 28 16.7C29.8 16.7 31.7 17 33.5 17.5C37.9 14.5 39.8 15.1 39.8 15.1C41 18.2 40.2 20.5 40 21.1C41.5 22.8 42.4 24.8 42.4 27.2C42.4 35.7 37.1 37.6 32.1 38.1C32.9 38.8 33.7 40.3 33.7 42.5C33.7 45.7 33.6 48.2 33.6 48.9C33.6 49.5 34 50.2 35.1 50C44.2 47 50.7 38.5 50.7 28.5C50.7 16 40.5 5.3 28 5.3Z" fill="#3C1E1E"/>
            <path d="M28 4C14.7452 4 4 14.7452 4 28C4 41.2548 14.7452 52 28 52C41.2548 52 52 41.2548 52 28C52 14.7452 41.2548 4 28 4ZM28 49.3333C16.2176 49.3333 6.66667 39.7824 6.66667 28C6.66667 16.2176 16.2176 6.66667 28 6.66667C39.7824 6.66667 49.3333 16.2176 49.3333 28C49.3333 39.7824 39.7824 49.3333 28 49.3333Z" fill="#9E8F5C" opacity="0.3"/>
        </g>
    </svg>
);

const NaverIcon = () => (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g filter="url(#filter0_d_1_4)">
            <path d="M28 50C40.1503 50 50 40.1503 50 28C50 15.8497 40.1503 6 28 6C15.8497 6 6 15.8497 6 28C6 40.1503 15.8497 50 28 50Z" fill="#03C75A" stroke="#02A449" strokeWidth="3"/>
            <path d="M16.4 16H24.8L33.2 28.5V16H39.6V40H31.2L22.8 27.5V40H16.4V16Z" fill="white"/>
            <path d="M28 4C14.7452 4 4 14.7452 4 28C4 41.2548 14.7452 52 28 52C41.2548 52 52 41.2548 52 28C52 14.7452 41.2548 4 28 4ZM28 49.3333C16.2176 49.3333 6.66667 39.7824 6.66667 28C6.66667 16.2176 16.2176 6.66667 28 6.66667C39.7824 6.66667 49.3333 16.2176 49.3333 28C49.3333 39.7824 39.7824 49.3333 28 49.3333Z" fill="#02A449" opacity="0.3"/>
        </g>
    </svg>
);

export default function Login() {
    const [memberId, setMemberId] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    const [showFindModal, setShowFindModal] = useState(false);
    const [findStep, setFindStep] = useState(1);
    const [findEmail, setFindEmail] = useState("");
    const [authCode, setAuthCode] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");

    // --- 추가: 비밀번호 찾기 기능 강화 상태 ---
    const [isSending, setIsSending] = useState(false); // 버튼 비활성화용
    const [timeLeft, setTimeLeft] = useState(0); // 타이머용(초)

    const [modal, setModal] = useState({ isOpen: false, message: "" });
    const alertSound = useMemo(() => new Audio("/sounds/alert_ding.mp3"), []);
    const API_BASE_URL = "http://localhost:8088/api/member";

    // --- 추가: 타이머 핸들러 ---
    useEffect(() => {
        if (timeLeft <= 0) return;
        const timer = setInterval(() => {
            setTimeLeft((prev) => prev - 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [timeLeft]);

    // 시간 포맷 함수 (초 -> 0:00)
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
    };

    const openAlert = (msg) => {
        alertSound.currentTime = 0;
        alertSound.play().catch(() => {});
        setModal({ isOpen: true, message: msg });
    };

    const handleLogin = async () => {
        try {
            const response = await axios.post(`${API_BASE_URL}/login`, {
                email: memberId,
                password: password,
            });

            if (response.status === 200) {
                const { token, nickname, bell, level } = response.data;
                sessionStorage.setItem("token", token);
                sessionStorage.setItem("nickname", nickname);
                sessionStorage.setItem("bell", bell);
                sessionStorage.setItem("level", level);

                openAlert(`${nickname}님 환영합니다! 🍃`);
                setTimeout(() => navigate("/home"), 1500);
            }
        } catch (error) {
            openAlert("로그인 정보를 확인해주세요. 😢");
        }
    };

    // Step 1: 인증번호 발송 (중복 클릭 방지 추가)
    const handleSendCode = async () => {
        if (!findEmail) return openAlert("이메일을 입력해주세요! 📧");
        setIsSending(true); // 버튼 비활성화 시작
        try {
            await axios.post(`${API_BASE_URL}/send-code`, { email: findEmail });
            openAlert("인증번호를 발송했습니다! \n메일함을 확인해주세요. 🕊️");
            setFindStep(2);
            setTimeLeft(300); // 5분(300초) 설정
        } catch (error) {
            openAlert("등록되지 않은 주민이거나 \n발송 중 오류가 발생했습니다.");
        } finally {
            setIsSending(false); // 버튼 다시 활성화
        }
    };

    // Step 2: 인증번호 검증 (시간 만료 체크 추가)
    const handleVerifyCode = async () => {
        if (!authCode) return openAlert("인증번호를 입력해주세요!");
        if (timeLeft <= 0) return openAlert("인증 시간이 만료되었습니다. \n다시 시도해주세요. ⏳");
        try {
            const response = await axios.post(`${API_BASE_URL}/verify-code`, {
                email: findEmail,
                code: authCode
            });
            if (response.data === true) {
                openAlert("인증 성공! ✨ \n새로운 비밀번호를 설정해주세요.");
                setFindStep(3);
                setTimeLeft(0); // 타이머 종료
            } else {
                openAlert("인증번호가 일치하지 않습니다. ❌");
            }
        } catch (error) {
            openAlert("검증 중 오류가 발생했습니다.");
        }
    };

    const handleResetPassword = async () => {
        const pwRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,16}$/;
        if (!pwRegex.test(newPassword)) return openAlert("비밀번호 규칙을 확인해주세요! \n(8~16자, 영문/숫자/특수문자 포함) 🔒");
        if (newPassword !== confirmNewPassword) return openAlert("비밀번호가 일치하지 않습니다. ❌");

        try {
            await axios.post(`${API_BASE_URL}/reset-password`, {
                email: findEmail,
                password: newPassword
            });
            openAlert("비밀번호가 변경되었습니다! \n새로운 비밀번호로 로그인하세요. 🎉");
            setShowFindModal(false);
            setFindStep(1);
            setFindEmail("");
            setTimeLeft(0);
        } catch (error) {
            openAlert("재설정에 실패했습니다.");
        }
    };

    const handleSocialLogin = (provider) => {
        window.location.href = `/oauth2/authorization/${provider}`;
    };

    return (
        <div
            className="relative w-full h-screen bg-cover bg-center overflow-hidden flex items-center justify-center"
            style={{backgroundImage: "url('/images/background.jpg')"}}
        >
            {/* --- A. 커스텀 알림 모달 --- */}
            {modal.isOpen && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="relative w-[350px] bg-[#fdf6e3] rounded-[40px] border-[6px] border-[#8b5a2b] shadow-2xl p-8 flex flex-col items-center animate-in zoom-in-95 duration-200">
                        <p className="text-[#5d4037] font-bold text-center whitespace-pre-wrap mb-6">{modal.message}</p>
                        <button onClick={() => setModal({isOpen:false, message:""})} className="bg-[#8b5a2b] text-white px-10 py-2 rounded-full font-black active:scale-95 transition-all">확인</button>
                    </div>
                </div>
            )}

            {/* --- B. 비밀번호 재설정 모달 --- */}
            {showFindModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="relative w-[450px] bg-[#fdf6e3] p-10 rounded-[50px] border-[8px] border-[#8b5a2b] shadow-2xl flex flex-col items-center animate-in zoom-in-95 duration-200">
                        <div className="absolute -top-12 bg-[#8b5a2b] px-10 py-3 rounded-[30px] border-[4px] border-white shadow-lg text-white font-black text-xl">
                            비밀번호 찾기 🍃
                        </div>

                        {findStep === 1 && (
                            <div className="w-full mt-6 space-y-5 text-center">
                                <p className="font-bold text-[#8b5a2b]">비밀번호를 찾고자 하는<br/>이메일을 입력해주세요.</p>
                                <input type="email" placeholder="이메일 주소 입력" value={findEmail} onChange={(e)=>setFindEmail(e.target.value)} className="w-full bg-[#efe7d1] border-none rounded-3xl py-4 px-6 text-[#5d4037] font-bold outline-none focus:ring-4 ring-[#8b5a2b]/20" />
                                <button
                                    onClick={handleSendCode}
                                    disabled={isSending}
                                    className={`w-full py-4 rounded-3xl font-black text-xl shadow-lg active:scale-95 transition-all ${isSending ? 'bg-gray-400 opacity-70' : 'bg-[#8b5a2b] text-white'}`}
                                >
                                    {isSending ? '발송 중...' : '인증번호 발송'}
                                </button>
                            </div>
                        )}

                        {findStep === 2 && (
                            <div className="w-full mt-6 space-y-5 text-center">
                                <div className="flex flex-col gap-2">
                                    <p className="font-bold text-[#8b5a2b]">메일로 발송된<br/>6자리 번호를 입력해주세요.</p>
                                    <span className="text-red-500 font-bold text-lg animate-pulse">{formatTime(timeLeft)}</span>
                                </div>
                                <input type="text" placeholder="인증번호 6자리" value={authCode} onChange={(e)=>setAuthCode(e.target.value)} className="w-full bg-[#efe7d1] border-none rounded-3xl py-4 px-6 font-bold outline-none text-center text-2xl tracking-[0.5em]" maxLength={6} />
                                <button
                                    onClick={handleVerifyCode}
                                    className="w-full bg-[#8b5a2b] text-white py-4 rounded-3xl font-black text-xl shadow-lg active:scale-95 transition-all"
                                >
                                    인증 확인
                                </button>
                                <button
                                    onClick={handleSendCode}
                                    disabled={isSending}
                                    className="text-sm text-[#8b5a2b] font-bold underline opacity-80 hover:opacity-100"
                                >
                                    인증번호 재발송
                                </button>
                            </div>
                        )}

                        {findStep === 3 && (
                            <div className="w-full mt-6 space-y-4 text-center">
                                <p className="font-bold text-[#8b5a2b]">새로 사용할<br/>비밀번호를 입력해주세요.</p>
                                <input type="password" placeholder="새 비밀번호 (8~16자, 특수문자 포함)" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} className="w-full bg-[#efe7d1] border-none rounded-3xl py-4 px-6 font-bold outline-none focus:ring-4 ring-[#8b5a2b]/20" />
                                <input type="password" placeholder="비밀번호 확인" value={confirmNewPassword} onChange={(e)=>setConfirmNewPassword(e.target.value)} className="w-full bg-[#efe7d1] border-none rounded-3xl py-4 px-6 font-bold outline-none focus:ring-4 ring-[#8b5a2b]/20" />
                                <button onClick={handleResetPassword} className="w-full bg-[#8b5a2b] text-white py-4 rounded-3xl font-black text-xl shadow-lg active:scale-95 transition-all">변경 완료</button>
                            </div>
                        )}

                        <button onClick={() => {setShowFindModal(false); setFindStep(1); setTimeLeft(0);}} className="mt-8 text-[#a67c52] font-bold underline cursor-pointer">돌아가기</button>
                    </div>
                </div>
            )}

            {/* --- C. 메인 로그인 박스 --- */}
            <div className="relative w-[450px] bg-[#fdf6e3] p-10 rounded-[50px] border-[8px] border-[#8b5a2b] shadow-[15px_15px_0px_rgba(139,90,43,0.15)] flex flex-col items-center">
                <div className="absolute -top-32">
                    <img src="/images/logo.png" alt="지어봐요 마이홈" className="w-[300px] drop-shadow-xl" />
                </div>

                <div className="mt-8 w-full space-y-6">
                    <div className="relative group">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🍃</span>
                        <input
                            type="text"
                            placeholder="아이디를 입력하세요."
                            value={memberId}
                            onChange={(e) => setMemberId(e.target.value)}
                            className="w-full bg-[#efe7d1] border-none rounded-3xl py-4 pl-12 pr-4 text-[#5d4037] font-bold placeholder-[#a67c52] focus:ring-4 ring-[#8b5a2b]/20 outline-none transition-all"
                        />
                    </div>

                    <div className="relative group">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🍃</span>
                        <input
                            type="password"
                            placeholder="비밀번호를 입력하세요."
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                            className="w-full bg-[#efe7d1] border-none rounded-3xl py-4 pl-12 pr-4 text-[#5d4037] font-bold placeholder-[#a67c52] focus:ring-4 ring-[#8b5a2b]/20 outline-none transition-all"
                        />
                    </div>

                    <button
                        onClick={handleLogin}
                        className="w-full bg-[#8b5a2b] hover:bg-[#6d4622] text-[#fdf6e3] py-5 rounded-[30px] text-2xl font-black shadow-lg transition-all active:scale-95"
                    >
                        로그인
                    </button>
                </div>

                <div className="mt-6 flex gap-6 text-[#8b5a2b] font-bold text-sm">
                    <Link to="/join" className="hover:underline">회원가입</Link>
                    <span className="text-[#a67c52]">|</span>
                    <button onClick={() => setShowFindModal(true)} className="hover:underline">비밀번호 찾기</button>
                </div>

                <div className="w-full flex items-center gap-3 my-8">
                    <div className="flex-1 h-[2px] bg-[#a67c52]/30"></div>
                    <span className="text-[#a67c52] text-xs font-bold">간편 로그인</span>
                    <div className="flex-1 h-[2px] bg-[#a67c52]/30"></div>
                </div>

                <div className="flex gap-5">
                    <button onClick={() => handleSocialLogin("google")} className="hover:scale-110 transition active:translate-y-1" aria-label="구글 로그인"><GoogleIcon/></button>
                    <button onClick={() => handleSocialLogin("github")} className="hover:scale-110 transition active:translate-y-1" aria-label="깃허브 로그인"><GithubIcon/></button>
                    <button onClick={() => handleSocialLogin("naver")} className="hover:scale-110 transition active:translate-y-1" aria-label="네이버 로그인"><NaverIcon/></button>
                </div>
            </div>

            {/* 데코레이션 이미지 */}
            <div
                className="absolute bottom-10 left-10 w-32 h-32 bg-contain bg-no-repeat opacity-80 pointer-events-none"
                style={{backgroundImage: "url('/images/isabelle.png')"}}
            ></div>
        </div>
    );
}