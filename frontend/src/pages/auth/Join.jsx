import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Join() {
  const [email, setEmail] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');

  // 상태 관리 (인증 및 로직)
  const [isSending, setIsSending] = useState(false); // 메일 발송 중 상태 (중복 클릭 방지)
  const [timeLeft, setTimeLeft] = useState(0); // 인증 남은 시간
  const [isEmailSent, setIsEmailSent] = useState(false); // 인증번호 발송 여부
  const [isEmailVerified, setIsEmailVerified] = useState(false); // 이메일 인증 완료 여부
  const [isNicknameChecked, setIsNicknameChecked] = useState(false); // 닉네임 체크 완료 여부

  // UI 관리
  // const [modal, setModal] = useState({ isOpen: false, message: "" });
  const [modal, setModal] = useState({ isOpen: false, message: '', showButton: true });
  const navigate = useNavigate();
  const API_BASE_URL = '/api/member';

  // 효과음
  const alertSound = useMemo(() => new Audio('/sounds/alert_ding.mp3'), []);

  // 타이머 핸들러
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timerId = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timerId);
  }, [timeLeft]);

  const formatTime = (time) => {
    const mins = Math.floor(time / 60);
    const secs = time % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // 비밀번호 유효성 검사 (영문, 숫자, 특수문자 포함 8~16자)
  const validatePassword = (pw) => {
    const regex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,16}$/;
    return regex.test(pw);
  };

  // 실시간 검증 상태 변수
  const isPasswordInvalid = password.length > 0 && !validatePassword(password);
  const isPasswordMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const openModal = (msg, showBtn = true) => {
    alertSound.currentTime = 0;
    alertSound.play().catch(() => {});
    setModal({ isOpen: true, message: msg, showButton: showBtn });
  };

  const closeModal = () => setModal({ isOpen: false, message: '' });

  // 1. 인증번호 발송
  const handleSendVerification = async () => {
    if (!email) return openModal('이메일을 입력해주세요! 📧');

    setIsSending(true);
    openModal('이메일 중복 확인 및\n인증번호 발송 중... 🕊️', false);

    try {
      await axios.post(`${API_BASE_URL}/send-registration-code`, { email });
      // 성공 시: 버튼이 있는 모달로 내용 업데이트
      openModal('사용 가능한 이메일입니다! ✨\n인증번호를 발송했습니다.🕊️', true);
      setIsEmailSent(true);
      setTimeLeft(300);
    } catch (error) {
      // 실패 시: 에러 메시지와 함께 버튼 노출
      const errorMsg = error.response?.data || '메일 발송에 실패했습니다. 😢';
      openModal(errorMsg, true);
    } finally {
      setIsSending(false);
    }
  };

  // 2. 인증번호 확인
  const handleVerifyCode = async () => {
    if (!authCode) return openModal('인증번호를 입력해주세요! 🔑');
    if (timeLeft <= 0) return openModal('인증 시간이 만료되었습니다. ⏳');
    try {
      const response = await axios.post(`${API_BASE_URL}/verify-code`, { email, code: authCode });
      if (response.data === true) {
        openModal('이메일 인증이 완료되었습니다! ✅');
        setIsEmailVerified(true);
        setTimeLeft(0);
      } else {
        openModal('인증번호가 일치하지 않습니다. ❌');
      }
    } catch (error) {
      openModal('인증 확인 중 오류가 발생했습니다.');
    }
  };

  // 3. 닉네임 중복 체크
  const handleCheckNickname = async () => {
    if (!nickname) return openModal('닉네임을 입력해주세요! 🍃');
    try {
      const response = await axios.get(`${API_BASE_URL}/check-nickname`, { params: { nickname } });
      if (response.data === true) {
        openModal('멋진 이름이네요! ✨\n사용 가능한 닉네임입니다.');
        setIsNicknameChecked(true);
      } else {
        openModal('이미 사용 중인 이름입니다. 😢');
      }
    } catch (error) {
      openModal('닉네임 체크 중 오류가 발생했습니다.');
    }
  };

  // 4. 최종 회원가입
  const handleJoin = async (e) => {
    e.preventDefault();
    if (!isEmailVerified) return openModal('이메일 인증을 완료해주세요! 🔒');
    if (isPasswordInvalid) return openModal('비밀번호 규칙을 지켜주세요! 🔒');
    if (isPasswordMismatch) return openModal('비밀번호가 일치하지 않습니다! ❌');
    if (!isNicknameChecked) return openModal('닉네임 중복 체크를 완료해주세요! 🔒');

    try {
      const response = await axios.post(`${API_BASE_URL}/join`, { email, password, nickname });
      if (response.status === 200 || response.status === 201) {
        openModal('마이홈의 주민이 되신 것을 환영합니다! 🎉');
        setTimeout(() => navigate('/'), 2000);
      }
    } catch (error) {
      openModal('회원가입에 실패했습니다.');
    }
  };

  return (
    <div
      className="relative w-full h-screen bg-cover bg-center overflow-hidden flex items-center justify-center"
      style={{ backgroundImage: "url('/images/background.jpg')" }}
    >
      {/* 커스텀 모달 */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative w-[380px] bg-[#fdf6e3] rounded-[40px] border-[6px] border-[#8b5a2b] shadow-2xl p-8 flex flex-col items-center animate-in zoom-in-95">
            <div className="h-10 w-full bg-[#8b5a2b] absolute top-0 rounded-t-[30px] flex items-center justify-center">
              <span className="text-white font-black text-sm tracking-widest">알 림</span>
            </div>
            <p className="mt-6 text-[#5d4037] font-bold text-center whitespace-pre-wrap">{modal.message}</p>
            <button
              onClick={closeModal}
              className="mt-6 px-10 py-2 bg-[#8b5a2b] text-white font-black rounded-full active:scale-95 transition-all"
            >
              확 인
            </button>
          </div>
        </div>
      )}

      <div className="relative w-[500px] bg-[#fdf6e3] p-10 rounded-[50px] border-[8px] border-[#8b5a2b] shadow-[15px_15px_0px_rgba(139,90,43,0.15)] flex flex-col items-center">
        <div className="absolute -top-44 pointer-events-none select-none">
          <img src="/images/join.png" alt="join" className="w-[450px] drop-shadow-xl transform rotate-2" />
        </div>

        <form onSubmit={handleJoin} className="mt-10 w-full space-y-4">
          {/* 이메일 영역 */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🍃</span>
              <input
                type="email"
                placeholder="이메일 주소"
                value={email}
                readOnly={isEmailVerified}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setIsEmailSent(false);
                }}
                className={`w-full bg-[#efe7d1] rounded-2xl py-3 pl-12 pr-4 text-[#5d4037] font-bold outline-none transition-all ${isEmailVerified ? 'opacity-60 ring-2 ring-green-500' : 'focus:ring-4 ring-[#8b5a2b]/20'}`}
              />
            </div>
            {!isEmailVerified && (
              <button
                type="button"
                disabled={isSending}
                onClick={handleSendVerification}
                className={`px-4 rounded-xl font-bold text-xs shadow-md whitespace-nowrap active:scale-95 transition-all ${isSending ? 'bg-gray-400' : 'bg-[#bc8a5f] text-white'}`}
              >
                {isSending ? '발송중...' : isEmailSent ? '재발송' : '인증요청'}
              </button>
            )}
          </div>

          {/* 인증번호 & 타이머 */}
          {isEmailSent && !isEmailVerified && (
            <div className="flex gap-2 animate-in slide-in-from-top-2">
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🔑</span>
                <input
                  type="text"
                  placeholder="인증번호 6자리"
                  value={authCode}
                  onChange={(e) => setAuthCode(e.target.value)}
                  className="w-full bg-[#efe7d1] rounded-2xl py-3 pl-12 pr-16 text-[#5d4037] font-bold outline-none"
                  maxLength={6}
                />
                <span
                  className={`absolute right-4 top-1/2 -translate-y-1/2 font-bold text-sm ${timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-[#8b5a2b]'}`}
                >
                  {formatTime(timeLeft)}
                </span>
              </div>
              <button
                type="button"
                onClick={handleVerifyCode}
                className="bg-[#8b5a2b] text-white px-4 rounded-xl font-bold text-xs"
              >
                확인
              </button>
            </div>
          )}

          {/* 비밀번호 & 규칙 안내 */}
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🍃</span>
            <input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full bg-[#efe7d1] rounded-2xl py-3 pl-12 pr-4 text-[#5d4037] font-bold outline-none transition-all ${isPasswordInvalid ? 'ring-4 ring-red-500/50 border-2 border-red-500' : password && validatePassword(password) ? 'ring-2 ring-green-500' : 'focus:ring-4 ring-[#8b5a2b]/20'}`}
            />
            {isPasswordInvalid && (
              <p className="text-red-500 text-xs font-bold mt-1 ml-4 animate-in fade-in">
                ❌ 영문, 숫자, 특수문자 포함 8~16자로 입력해주세요!
              </p>
            )}
          </div>

          {/* 비밀번호 확인 & 불일치 안내 */}
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🍃</span>
            <input
              type="password"
              placeholder="비밀번호 확인"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`w-full bg-[#efe7d1] rounded-2xl py-3 pl-12 pr-4 text-[#5d4037] font-bold outline-none transition-all ${isPasswordMismatch ? 'ring-4 ring-red-500/50 border-2 border-red-500' : confirmPassword && password === confirmPassword ? 'ring-2 ring-green-500' : 'focus:ring-4 ring-[#8b5a2b]/20'}`}
            />
            {isPasswordMismatch && (
              <p className="text-red-500 text-xs font-bold mt-1 ml-4 animate-in fade-in">
                ❌ 비밀번호가 일치하지 않습니다!
              </p>
            )}
          </div>

          {/* 닉네임 */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl">🍃</span>
              <input
                type="text"
                placeholder="닉네임 입력"
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value);
                  setIsNicknameChecked(false);
                }}
                className={`w-full bg-[#efe7d1] rounded-2xl py-3 pl-12 pr-4 text-[#5d4037] font-bold outline-none transition-all ${isNicknameChecked ? 'ring-2 ring-green-500' : 'focus:ring-4 ring-[#8b5a2b]/20'}`}
              />
            </div>
            <button
              type="button"
              onClick={handleCheckNickname}
              className="bg-[#bc8a5f] text-white px-4 rounded-xl font-bold text-xs active:scale-95 transition-all"
            >
              중복체크
            </button>
          </div>

          <button
            type="submit"
            className="w-full bg-[#8b5a2b] hover:bg-[#6d4622] text-[#fdf6e3] py-4 rounded-[25px] text-xl font-black shadow-lg transition-all active:scale-95"
          >
            주민 가입 완료!
          </button>
        </form>

        <div className="mt-6 text-[#8b5a2b] font-bold text-sm">
          이미 주민이신가요?{' '}
          <Link to="/" className="underline ml-1">
            로그인하러 가기
          </Link>
        </div>
      </div>
    </div>
  );
}
