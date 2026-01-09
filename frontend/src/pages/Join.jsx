import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

export default function Join() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [nickname, setNickname] = useState("");
    const [isNicknameChecked, setIsNicknameChecked] = useState(false);
    const navigate = useNavigate();

    // 서버 주소 설정 (로그에 찍힌 8088 포트로 수정)
    const API_BASE_URL = "http://localhost:8088/api/member";

    // 1. 닉네임 중복 체크 함수
    const handleCheckNickname = async () => {
        if (!nickname) {
            alert("닉네임을 입력해주세요! 🍃");
            return;
        }
        try {
            // 백엔드: boolean existsByNickname(String nickname) 결과에 맞춰 처리
            const response = await axios.get(`${API_BASE_URL}/check-nickname`, {
                params: { nickname }
            });

            // 서버에서 중복되지 않았을 때(available: true) 처리
            if (response.data === true || response.data.available === true) {
                alert("사용 가능한 멋진 닉네임이에요! ✨");
                setIsNicknameChecked(true);
            } else {
                alert("이미 다른 주민이 사용 중인 닉네임이에요. 😢");
                setIsNicknameChecked(false);
            }
        } catch (error) {
            console.error("중복 체크 에러:", error);
            alert("중복 체크 중 오류가 발생했습니다. 서버를 확인해주세요.");
        }
    };

    // 2. 회원가입 제출 함수
    const handleJoin = async (e) => {
        e.preventDefault();

        // [핵심 로직] 중복 체크 미통과 시 가입 차단
        if (!isNicknameChecked) {
            alert("닉네임 중복 체크를 먼저 완료해주세요! 🔑");
            return;
        }

        try {
            const response = await axios.post(`${API_BASE_URL}/join`, {
                email,
                password,
                nickname,
            });

            if (response.status === 200 || response.status === 201) {
                alert("마이홈의 새로운 주민이 되신 것을 환영합니다! 🎉");
                navigate("/login");
            }
        } catch (error) {
            console.error("회원가입 에러:", error);
            alert("회원가입에 실패했습니다. 입력 정보를 다시 확인해주세요.");
        }
    };

    return (
        <div
            className="relative w-full h-screen bg-cover bg-center overflow-hidden flex items-center justify-center"
            style={{ backgroundImage: "url('/images/background.jpg')" }}
        >
            {/*<Link*/}
            {/*    to="/"*/}
            {/*    className="absolute top-6 left-6 bg-[#fdf6e3] border-[4px] border-[#8b5a2b] p-2 rounded-2xl shadow-md hover:scale-110 transition"*/}
            {/*>*/}
            {/*    <span className="text-2xl text-[#8b5a2b]">🏠</span>*/}
            {/*</Link>*/}

            <div className="relative w-[480px] bg-[#fdf6e3] p-10 rounded-[50px] border-[8px] border-[#8b5a2b] shadow-[15px_15px_0px_rgba(139,90,43,0.15)] flex flex-col items-center">
                <div className="absolute -top-10 bg-[#8b5a2b] px-10 py-3 rounded-[30px] border-[5px] border-white shadow-lg transform rotate-1">
                    <h1 className="text-3xl font-black text-white tracking-tight">주민 등록하기</h1>
                </div>

                <form onSubmit={handleJoin} className="mt-8 w-full space-y-5">
                    <div className="relative group">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">📧</span>
                        <input
                            type="email"
                            placeholder="이메일을 입력하세요"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-[#efe7d1] border-none rounded-3xl py-4 pl-12 pr-4 text-[#5d4037] font-bold placeholder-[#a67c52] focus:ring-4 ring-[#8b5a2b]/20 outline-none transition-all"
                            required
                        />
                    </div>

                    <div className="relative group">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🔑</span>
                        <input
                            type="password"
                            placeholder="비밀번호를 입력하세요"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-[#efe7d1] border-none rounded-3xl py-4 pl-12 pr-4 text-[#5d4037] font-bold placeholder-[#a67c52] focus:ring-4 ring-[#8b5a2b]/20 outline-none transition-all"
                            required
                        />
                    </div>

                    <div className="relative flex gap-2">
                        <div className="relative flex-1">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🍃</span>
                            <input
                                type="text"
                                placeholder="닉네임"
                                value={nickname}
                                onChange={(e) => {
                                    setNickname(e.target.value);
                                    setIsNicknameChecked(false); // 닉네임 수정 시 체크 상태 초기화
                                }}
                                // 중복 체크 완료 시 배경색 변경 (UX 포인트)
                                className={`w-full border-none rounded-3xl py-4 pl-12 pr-4 text-[#5d4037] font-bold placeholder-[#a67c52] focus:ring-4 outline-none transition-all ${
                                    isNicknameChecked ? "bg-[#d4edda] ring-green-500/20" : "bg-[#efe7d1] ring-[#8b5a2b]/20"
                                }`}
                                required
                            />
                        </div>
                        <button
                            type="button"
                            onClick={handleCheckNickname}
                            disabled={isNicknameChecked} // 이미 완료했다면 버튼 비활성화
                            className={`${
                                isNicknameChecked ? "bg-green-600 cursor-default" : "bg-[#bc8a5f] hover:bg-[#a8794f]"
                            } text-white px-4 rounded-2xl font-bold text-sm shadow-md transition-all active:scale-95 whitespace-nowrap`}
                        >
                            {isNicknameChecked ? "체크 완료 ✔" : "중복 체크"}
                        </button>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-[#8b5a2b] hover:bg-[#6d4622] text-[#fdf6e3] py-5 mt-4 rounded-[30px] text-2xl font-black shadow-lg transition-all active:scale-95"
                    >
                        주민 가입 완료!
                    </button>
                </form>

                <div className="mt-6 text-[#8b5a2b] font-bold text-sm">
                    이미 주민이신가요? <Link to="/login" className="underline ml-1">로그인하러 가기</Link>
                </div>
            </div>
        </div>
    );
}