// import React, { useState, useMemo } from "react";
// import { Link, useNavigate } from "react-router-dom";
// import axios from "axios";
//
// export default function Join() {
//     const [email, setEmail] = useState("");
//     const [password, setPassword] = useState("");
//     const [confirmPassword, setConfirmPassword] = useState("");
//     const [nickname, setNickname] = useState("");
//     const [isEmailChecked, setIsEmailChecked] = useState(false);
//     const [isNicknameChecked, setIsNicknameChecked] = useState(false);
//
//     // --- 커스텀 모달 및 효과음 상태 ---
//     const [modal, setModal] = useState({ isOpen: false, message: "" });
//     const navigate = useNavigate();
//     const API_BASE_URL = "http://localhost:8088/api/member";
//
//     // 효과음 파일 경로 설정 (public/sounds/ 폴더에 저장 권장)
//     const alertSound = useMemo(() => new Audio("/sounds/alert_ding.mp3"), []);
//
//     // 모달 제어 함수 (소리 재생 포함)
//     const openModal = (msg) => {
//         // 효과음 재생 (사용자 클릭 이벤트 직후에 실행되어 자동재생 차단 방지)
//         alertSound.currentTime = 0; // 재생 위치 초기화
//         alertSound.play().catch(e => console.log("Sound play blocked:", e));
//
//         setModal({ isOpen: true, message: msg });
//     };
//
//     const closeModal = () => setModal({ isOpen: false, message: "" });
//
//     // --- 유효성 및 중복 체크 로직 ---
//     const validatePassword = (pw) => {
//         const regex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,16}$/;
//         return regex.test(pw);
//     };
//
//     const handleCheckEmail = async () => {
//         if (!email) return openModal("이메일을 입력해주세요! 📧");
//         try {
//             const response = await axios.get(`${API_BASE_URL}/check-email`, { params: { email } });
//             if (response.data === true) {
//                 openModal("사용 가능한 이메일입니다! ✨");
//                 setIsEmailChecked(true);
//             } else {
//                 openModal("이미 등록된 이메일입니다. 😢");
//                 setIsEmailChecked(false);
//             }
//         } catch (error) {
//             openModal("이메일 체크 중 오류가 발생했습니다.");
//         }
//     };
//
//     const handleCheckNickname = async () => {
//         if (!nickname) return openModal("닉네임을 입력해주세요! 🍃");
//         try {
//             const response = await axios.get(`${API_BASE_URL}/check-nickname`, { params: { nickname } });
//             if (response.data === true) {
//                 openModal("멋진 이름이네요! \n사용 가능합니다. ✨");
//                 setIsNicknameChecked(true);
//             } else {
//                 openModal("이미 있는 이름입니다. \n다른 이름으로 지어주세요. 😢");
//                 setIsNicknameChecked(false);
//             }
//         } catch (error) {
//             openModal("닉네임 체크 중 오류가 발생했습니다.");
//         }
//     };
//
//     const handleJoin = async (e) => {
//         e.preventDefault();
//         if (!isEmailChecked) return openModal("이메일 중복 체크를 완료해주세요! 🔑");
//         if (!validatePassword(password)) return openModal("비밀번호 규칙을 확인해주세요! \n(8~16자, 영문/숫자/특수문자 포함) 🔒");
//         if (password !== confirmPassword) return openModal("비밀번호가 일치하지 않습니다! ❌");
//         if (!isNicknameChecked) return openModal("닉네임 중복 체크를 완료해주세요! 🔑");
//
//         try {
//             const response = await axios.post(`${API_BASE_URL}/join`, { email, password, nickname });
//             if (response.status === 200 || response.status === 201) {
//                 openModal("마이홈의 주민이 되신 것을 환영합니다! 🎉");
//                 setTimeout(() => navigate("/"), 2000);
//             }
//         } catch (error) {
//             openModal("회원가입에 실패했습니다.");
//         }
//     };
//
//     return (
//         <div className="relative w-full h-screen bg-cover bg-center overflow-hidden flex items-center justify-center" style={{ backgroundImage: "url('/images/background.jpg')" }}>
//
//             {/* 커스텀 모달 UI */}
//             {modal.isOpen && (
//                 <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
//                     <div className="relative w-[380px] bg-[#fdf6e3] rounded-[40px] border-[6px] border-[#8b5a2b] shadow-2xl animate-in zoom-in-95 duration-200">
//                         <div className="h-10 bg-[#8b5a2b] flex items-center justify-center rounded-t-[30px]">
//                             <span className="text-white font-black text-sm tracking-widest">알 림</span>
//                         </div>
//                         <div className="p-8 flex flex-col items-center">
//                             <div className="mb-2 text-3xl">🍃</div>
//                             <p className="text-[#5d4037] font-bold text-center text-base leading-relaxed whitespace-pre-wrap">
//                                 {modal.message}
//                             </p>
//                             <button onClick={closeModal} className="mt-6 px-10 py-2 bg-[#a67c52] hover:bg-[#8b5a2b] text-white font-black rounded-full shadow-[0_4px_0_#6d4622] active:translate-y-1 active:shadow-none cursor-pointer">
//                                 확 인
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             )}
//
//             <div className="relative w-[500px] bg-[#fdf6e3] p-10 rounded-[50px] border-[8px] border-[#8b5a2b] shadow-[15px_15px_0px_rgba(139,90,43,0.15)] flex flex-col items-center z-10">
//                 <div className="absolute -top-44 pointer-events-none select-none">
//                     <img src="/images/join.png" alt="주민 등록하기" className="w-[450px] drop-shadow-xl transform rotate-2" />
//                 </div>
//
//                 <form onSubmit={handleJoin} className="mt-10 w-full space-y-4">
//                     {/* ... 폼 필드들 (이메일, 비밀번호, 닉네임) 동일 ... */}
//                     <div className="flex gap-2">
//                         <div className="relative flex-1">
//                             <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🍃</span>
//                             <input type="email" placeholder="이메일을 입력하세요" value={email} onChange={(e) => { setEmail(e.target.value); setIsEmailChecked(false); }} className={`w-full bg-[#efe7d1] border-none rounded-2xl py-3 pl-12 pr-4 text-[#5d4037] font-bold outline-none transition-all ${isEmailChecked ? "ring-2 ring-green-500" : "focus:ring-4 ring-[#8b5a2b]/20"}`} required />
//                         </div>
//                         <button type="button" onClick={handleCheckEmail} className="bg-[#bc8a5f] hover:bg-[#a8794f] text-white px-4 rounded-xl font-bold text-xs shadow-md whitespace-nowrap active:scale-95 transition-all cursor-pointer">중복체크</button>
//                     </div>
//
//                     {/*<div className="relative">*/}
//                     {/*    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🍃</span>*/}
//                     {/*    <input type="password" placeholder="비밀번호를 입력하세요 " value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-[#efe7d1] border-none rounded-2xl py-3 pl-12 pr-4 text-[#5d4037] font-bold outline-none focus:ring-4 ring-[#8b5a2b]/20" required />*/}
//                     {/*</div>*/}
//
//                     {/*<div className="relative">*/}
//                     {/*    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🍃</span>*/}
//                     {/*    <input type="password" placeholder="비밀번호 확인" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={`w-full bg-[#efe7d1] border-none rounded-2xl py-3 pl-12 pr-4 text-[#5d4037] font-bold outline-none focus:ring-4 ring-[#8b5a2b]/20 ${confirmPassword && password === confirmPassword ? "ring-2 ring-green-500" : ""}`} required />*/}
//                     {/*    {confirmPassword && password !== confirmPassword && <p className="text-[16px] text-red-500 mt-1 ml-4 font-bold">비밀번호가 일치하지 않습니다.</p>}*/}
//                     {/*</div>*/}
//
//                     {/* 비밀번호 영역 */}
//                     <div className="relative">
//                         <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🍃</span>
//                         <input
//                             type="password"
//                             placeholder="비밀번호를 입력하세요"
//                             value={password}
//                             onChange={(e) => setPassword(e.target.value)}
//                             className={`w-full bg-[#efe7d1] border-none rounded-2xl py-3 pl-12 pr-4 text-[#5d4037] font-bold outline-none focus:ring-4 ring-[#8b5a2b]/20 transition-all ${
//                                 password && validatePassword(password) ? "ring-2 ring-green-500" : ""
//                             }`}
//                             required
//                         />
//                         {password && !validatePassword(password) && (
//                             <p className="text-[16px] text-red-500 mt-1 ml-4 font-bold animate-pulse">
//                                 영문, 숫자, 특수문자 포함 8~16자로 입력해주세요! 🔒
//                             </p>
//                         )}
//                         {password && validatePassword(password) && (
//                             <p className="text-[16px] text-green-600 mt-1 ml-4 font-bold">
//                                 사용 가능한 비밀번호 형식입니다! ✨
//                             </p>
//                         )}
//                     </div>
//
//                     {/* 비밀번호 확인 영역 */}
//                     <div className="relative">
//                         <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🍃</span>
//                         <input
//                             type="password"
//                             placeholder="비밀번호 확인"
//                             value={confirmPassword}
//                             onChange={(e) => setConfirmPassword(e.target.value)}
//                             className={`w-full bg-[#efe7d1] border-none rounded-2xl py-3 pl-12 pr-4 text-[#5d4037] font-bold outline-none focus:ring-4 ring-[#8b5a2b]/20 transition-all ${
//                                 confirmPassword && password === confirmPassword ? "ring-2 ring-green-500" : ""
//                             }`}
//                             required
//                         />
//                         {confirmPassword && password !== confirmPassword && (
//                             <p className="text-[16px] text-red-500 mt-1 ml-4 font-bold">
//                                 비밀번호가 일치하지 않습니다. ❌
//                             </p>
//                         )}
//                         {confirmPassword && password === confirmPassword && (
//                             <p className="text-[16px] text-green-600 mt-1 ml-4 font-bold">
//                                 비밀번호가 일치합니다! ✨
//                             </p>
//                         )}
//                     </div>
//
//                     <div className="flex gap-2">
//                         <div className="relative flex-1">
//                             <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🍃</span>
//                             <input type="text" placeholder="닉네임" value={nickname} onChange={(e) => { setNickname(e.target.value); setIsNicknameChecked(false); }} className={`w-full bg-[#efe7d1] border-none rounded-2xl py-3 pl-12 pr-4 text-[#5d4037] font-bold outline-none transition-all ${isNicknameChecked ? "ring-2 ring-green-500" : "focus:ring-4 ring-[#8b5a2b]/20"}`} required />
//                         </div>
//                         <button type="button" onClick={handleCheckNickname} className="bg-[#bc8a5f] hover:bg-[#a8794f] text-white px-4 rounded-xl font-bold text-xs shadow-md whitespace-nowrap active:scale-95 transition-all cursor-pointer">중복체크</button>
//                     </div>
//
//                     <button type="submit" className="w-full bg-[#8b5a2b] hover:bg-[#6d4622] text-[#fdf6e3] py-4 mt-2 rounded-[25px] text-xl font-black shadow-lg transition-all active:scale-95 cursor-pointer">주민 가입 완료!</button>
//                 </form>
//
//                 <div className="mt-6 text-[#8b5a2b] font-bold text-sm">
//                     이미 주민이신가요? <Link to="/" className="underline ml-1">로그인하러 가기</Link>
//                 </div>
//             </div>
//         </div>
//     );
// }

import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

export default function Join() {
    const [email, setEmail] = useState("");
    const [authCode, setAuthCode] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [nickname, setNickname] = useState("");

    // 상태 관리
    const [isEmailSent, setIsEmailSent] = useState(false); // 인증번호 발송 여부
    const [isEmailVerified, setIsEmailVerified] = useState(false); // 이메일 인증 완료 여부
    const [isNicknameChecked, setIsNicknameChecked] = useState(false); // 닉네임 중복체크 여부

    // 모달 및 네비게이션
    const [modal, setModal] = useState({ isOpen: false, message: "" });
    const navigate = useNavigate();
    const API_BASE_URL = "http://localhost:8088/api/member";

    // 효과음 설정
    const alertSound = useMemo(() => new Audio("/sounds/alert_ding.mp3"), []);

    const openModal = (msg) => {
        alertSound.currentTime = 0;
        alertSound.play().catch(() => {});
        setModal({ isOpen: true, message: msg });
    };

    const closeModal = () => setModal({ isOpen: false, message: "" });

    // 유효성 검사 규칙
    const validatePassword = (pw) => {
        const regex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,16}$/;
        return regex.test(pw);
    };

    // 1. 인증번호 발송 (백엔드에서 중복 체크 후 발송)
    const handleSendVerification = async () => {
        if (!email) return openModal("이메일을 입력해주세요! 📧");
        try {
            await axios.post(`${API_BASE_URL}/send-registration-code`, { email });
            openModal("사용 가능한 이메일입니다! ✨\n인증번호를 발송했습니다.🕊️");
            setIsEmailSent(true);
        } catch (error) {
            const errorMsg = error.response?.data || "이미 가입된 이메일이거나 오류가 발생했습니다. 😢";
            openModal(errorMsg);
            setIsEmailSent(false);
        }
    };

    // 2. 인증번호 확인
    const handleVerifyCode = async () => {
        if (!authCode) return openModal("인증번호를 입력해주세요! 🔑");
        try {
            const response = await axios.post(`${API_BASE_URL}/verify-code`, { email, code: authCode });
            if (response.data === true) {
                openModal("이메일 인증이 완료되었습니다! ✅");
                setIsEmailVerified(true);
            } else {
                openModal("인증번호가 일치하지 않습니다. ❌");
            }
        } catch (error) {
            openModal("인증 확인 중 오류가 발생했습니다.");
        }
    };

    // 3. 닉네임 중복 체크
    const handleCheckNickname = async () => {
        if (!nickname) return openModal("닉네임을 입력해주세요! 🍃");
        try {
            const response = await axios.get(`${API_BASE_URL}/check-nickname`, { params: { nickname } });
            if (response.data === true) {
                openModal("멋진 이름이네요! ✨\n사용 가능한 닉네임입니다.");
                setIsNicknameChecked(true);
            } else {
                openModal("이미 있는 이름입니다. 😢\n다른 이름을 입력해주세요.");
                setIsNicknameChecked(false);
            }
        } catch (error) {
            openModal("닉네임 체크 중 오류가 발생했습니다.");
        }
    };

    // 4. 최종 회원가입 제출
    const handleJoin = async (e) => {
        e.preventDefault();
        if (!isEmailVerified) return openModal("이메일 인증을 완료해주세요! 🔒");
        if (!validatePassword(password)) return openModal("비밀번호 규칙을 확인해주세요! (8~16자, 특수문자 포함) 🔒");
        if (password !== confirmPassword) return openModal("비밀번호가 일치하지 않습니다! ❌");
        if (!isNicknameChecked) return openModal("닉네임 중복 체크를 완료해주세요! 🔒");

        try {
            const response = await axios.post(`${API_BASE_URL}/join`, { email, password, nickname });
            if (response.status === 200 || response.status === 201) {
                openModal("마이홈의 주민이 되신 것을 환영합니다! 🎉");
                setTimeout(() => navigate("/"), 2000);
            }
        } catch (error) {
            openModal("회원가입에 실패했습니다. 다시 시도해주세요.");
        }
    };

    return (
        <div className="relative w-full h-screen bg-cover bg-center overflow-hidden flex items-center justify-center" style={{ backgroundImage: "url('/images/background.jpg')" }}>

            {/* 커스텀 모달 */}
            {modal.isOpen && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="relative w-[380px] bg-[#fdf6e3] rounded-[40px] border-[6px] border-[#8b5a2b] shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="h-10 bg-[#8b5a2b] flex items-center justify-center rounded-t-[30px]">
                            <span className="text-white font-black text-sm tracking-widest">알 림</span>
                        </div>
                        <div className="p-8 flex flex-col items-center">
                            <p className="text-[#5d4037] font-bold text-center text-base leading-relaxed whitespace-pre-wrap">
                                {modal.message}
                            </p>
                            <button onClick={closeModal} className="mt-6 px-10 py-2 bg-[#8b5a2b] text-white font-black rounded-full shadow-lg active:scale-95 transition-all">
                                확 인
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="relative w-[500px] bg-[#fdf6e3] p-10 rounded-[50px] border-[8px] border-[#8b5a2b] shadow-[15px_15px_0px_rgba(139,90,43,0.15)] flex flex-col items-center">
                <div className="absolute -top-44 pointer-events-none select-none">
                    <img src="/images/join.png" alt="주민 등록하기" className="w-[450px] drop-shadow-xl transform rotate-2" />
                </div>

                <form onSubmit={handleJoin} className="mt-10 w-full space-y-4">
                    {/* 이메일 입력 및 인증 요청 */}
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🍃</span>
                            <input
                                type="email"
                                placeholder="이메일 주소"
                                value={email}
                                readOnly={isEmailVerified}
                                onChange={(e) => { setEmail(e.target.value); setIsEmailSent(false); }}
                                className={`w-full bg-[#efe7d1] border-none rounded-2xl py-3 pl-12 pr-4 text-[#5d4037] font-bold outline-none transition-all ${isEmailVerified ? "opacity-60 ring-2 ring-green-500" : "focus:ring-4 ring-[#8b5a2b]/20"}`}
                                required
                            />
                        </div>
                        {!isEmailVerified && (
                            <button type="button" onClick={handleSendVerification} className="bg-[#bc8a5f] hover:bg-[#a8794f] text-white px-4 rounded-xl font-bold text-xs shadow-md whitespace-nowrap active:scale-95 transition-all">
                                {isEmailSent ? "재발송" : "인증요청"}
                            </button>
                        )}
                    </div>

                    {/* 인증번호 입력 (발송된 경우만 표시) */}
                    {isEmailSent && !isEmailVerified && (
                        <div className="flex gap-2 animate-in slide-in-from-top-2 duration-300">
                            <div className="relative flex-1">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🔑</span>
                                <input
                                    type="text"
                                    placeholder="인증번호 6자리"
                                    value={authCode}
                                    onChange={(e) => setAuthCode(e.target.value)}
                                    className="w-full bg-[#efe7d1] border-none rounded-2xl py-3 pl-12 pr-4 text-[#5d4037] font-bold outline-none focus:ring-4 ring-[#8b5a2b]/20"
                                    maxLength={6}
                                />
                            </div>
                            <button type="button" onClick={handleVerifyCode} className="bg-[#8b5a2b] hover:bg-[#6d4622] text-white px-4 rounded-xl font-bold text-xs shadow-md active:scale-95 transition-all">인증확인</button>
                        </div>
                    )}

                    {/* 비밀번호 */}
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🍃</span>
                        <input
                            type="password"
                            placeholder="비밀번호 (영문+숫자+특수 8~16자)"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={`w-full bg-[#efe7d1] border-none rounded-2xl py-3 pl-12 pr-4 text-[#5d4037] font-bold outline-none focus:ring-4 ring-[#8b5a2b]/20 ${password && validatePassword(password) ? "ring-2 ring-green-500" : ""}`}
                            required
                        />
                    </div>

                    {/* 비밀번호 확인 */}
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🍃</span>
                        <input
                            type="password"
                            placeholder="비밀번호 확인"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className={`w-full bg-[#efe7d1] border-none rounded-2xl py-3 pl-12 pr-4 text-[#5d4037] font-bold outline-none focus:ring-4 ring-[#8b5a2b]/20 ${confirmPassword && password === confirmPassword ? "ring-2 ring-green-500" : ""}`}
                            required
                        />
                    </div>

                    {/* 닉네임 */}
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🍃</span>
                            <input
                                type="text"
                                placeholder="닉네임 입력"
                                value={nickname}
                                onChange={(e) => { setNickname(e.target.value); setIsNicknameChecked(false); }}
                                className={`w-full bg-[#efe7d1] border-none rounded-2xl py-3 pl-12 pr-4 text-[#5d4037] font-bold outline-none transition-all ${isNicknameChecked ? "ring-2 ring-green-500" : "focus:ring-4 ring-[#8b5a2b]/20"}`}
                                required
                            />
                        </div>
                        <button type="button" onClick={handleCheckNickname} className="bg-[#bc8a5f] hover:bg-[#a8794f] text-white px-4 rounded-xl font-bold text-xs shadow-md active:scale-95 transition-all">중복체크</button>
                    </div>

                    <button type="submit" className="w-full bg-[#8b5a2b] hover:bg-[#6d4622] text-[#fdf6e3] py-4 mt-2 rounded-[25px] text-xl font-black shadow-lg transition-all active:scale-95">주민 가입 완료!</button>
                </form>

                <div className="mt-6 text-[#8b5a2b] font-bold text-sm">
                    이미 주민이신가요? <Link to="/" className="underline ml-1">로그인하러 가기</Link>
                </div>
            </div>
        </div>
    );
}