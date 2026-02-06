import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { COLORS } from '../../constants/colors';
import AspectLayout from '../../components/layout/AspectLayout';

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
    if (!email) return openModal('이메일을 입력해주세요');

    setIsSending(true);
    openModal('이메일 중복 확인 및\n인증번호 발송 중 입니다', false);

    try {
      await axios.post(`${API_BASE_URL}/send-registration-code`, { email });
      // 성공 시: 버튼이 있는 모달로 내용 업데이트
      openModal('사용 가능한 이메일입니다\n인증번호를 발송했습니다', true);
      setIsEmailSent(true);
      setTimeLeft(300);
    } catch (error) {
      // 실패 시: 에러 메시지와 함께 버튼 노출
      const errorMsg = error.response?.data || '메일 발송에 실패했습니다';
      openModal(errorMsg, true);
    } finally {
      setIsSending(false);
    }
  };

  // 2. 인증번호 확인
  const handleVerifyCode = async () => {
    if (!authCode) return openModal('인증번호를 입력해주세요');
    if (timeLeft <= 0) return openModal('인증 시간이 만료되었습니다');
    try {
      const response = await axios.post(`${API_BASE_URL}/verify-code`, { email, code: authCode });
      if (response.data === true) {
        openModal('이메일 인증이 완료되었습니다');
        setIsEmailVerified(true);
        setTimeLeft(0);
      } else {
        openModal('인증번호가 일치하지 않습니다');
      }
    } catch (error) {
      openModal('인증 확인 중 오류가 발생했습니다');
    }
  };

  // 3. 닉네임 중복 체크
  // const handleCheckNickname = async () => {
  //   if (!nickname) return openModal('닉네임을 입력해주세요! 🍃');
  //   try {
  //     const response = await axios.get(`${API_BASE_URL}/check-nickname`, { params: { nickname } });
  //     if (response.data === true) {
  //       openModal('멋진 이름이네요! ✨\n사용 가능한 닉네임입니다.');
  //       setIsNicknameChecked(true);
  //     } else {
  //       openModal('이미 사용 중인 이름입니다. 😢');
  //     }
  //   } catch (error) {
  //     openModal('닉네임 체크 중 오류가 발생했습니다.');
  //   }
  // };

  // 변경(금칙어 추가)
  const handleCheckNickname = async () => {
    if (!nickname) return openModal('닉네임을 입력해주세요');
    try {
      const response = await axios.get(`${API_BASE_URL}/check-nickname`, { params: { nickname } });
      if (response.data.available) {
        openModal('사용 가능한 닉네임입니다');
        setIsNicknameChecked(true);
      } else {
        openModal(response.data.message);
      }
    } catch (error) {
      // 400 Bad Request = 금칙어/유효성 실패
      if (error.response?.data?.message) {
        openModal(error.response.data.message);
      } else {
        openModal('사용할 수 없는 닉네임 입니다');
      }
    }
  };

  // 4. 최종 회원가입
  const handleJoin = async (e) => {
    e.preventDefault();
    if (!isEmailVerified) return openModal('이메일 인증을 완료해주세요');
    if (isPasswordInvalid) return openModal('비밀번호 규칙을 지켜주세요');
    if (isPasswordMismatch) return openModal('비밀번호가 일치하지 않습니다');
    if (!isNicknameChecked) return openModal('닉네임 중복 체크를 완료해주세요');

    try {
      const response = await axios.post(`${API_BASE_URL}/join`, { email, password, nickname });
      if (response.status === 200 || response.status === 201) {
        openModal('마이홈의 주민이\n되신 것을 환영합니다!');
        setTimeout(() => navigate('/'), 2000);
      }
    } catch (error) {
      openModal('회원가입에 실패했습니다');
    }
  };

  return (
    <AspectLayout>
      <div className="w-full h-full bg-cover bg-center flex items-center justify-center overflow-hidden font-gosanja bg-[url('/images/bg-pattern-1.png')]">
        {/* 커스텀 모달 */}
        {modal.isOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div
              className="relative w-[18.23cqw] rounded-[2.08cqw] border-[0.31cqw] shadow-2xl p-[1.67cqw] flex flex-col items-center animate-in zoom-in-95 duration-200"
              style={{ backgroundColor: COLORS.ac.creamWhite, borderColor: COLORS.ac.coffeeBrown }}
            >
              <p
                className="font-bold text-center whitespace-pre-wrap mb-[1.25cqw] text-[0.83cqw]"
                style={{ color: COLORS.text }}
              >
                {modal.message}
              </p>
              <button
                onClick={closeModal}
                className="px-[2.08cqw] py-[0.42cqw] rounded-full font-black active:scale-95 transition-all text-[1.04cqw]"
                style={{ backgroundColor: COLORS.ac.coffeeBrown, color: COLORS.ac.creamIvory }}
              >
                확인
              </button>
            </div>
          </div>
        )}

        {/* 메인 박스 */}
        <div
          className="relative flex flex-col items-center pt-[3.13cqw]"
          style={{
            width: '29.17cqw',
            height: '40.63cqw',
            borderRadius: '4.17cqw',
            backgroundColor: COLORS.ac.softYellow,
            boxShadow: '0.78cqw 0.78cqw 0px rgba(139,90,43,0.15)',
          }}
        >
          {/* 타이틀 배지 "회원가입" */}
          <div
            className="absolute -top-[2.29cqw] flex items-center justify-center text-white text-[2.5cqw] font-black tracking-widest whitespace-nowrap"
            style={{
              width: '16.67cqw',
              height: '4.58cqw',
              borderRadius: '2.29cqw',
              backgroundColor: COLORS.ac.coffeeBrown,
              boxShadow: `0px 0.42cqw 0px ${COLORS.ac.darkBrown}`, // 3D 그림자 효과
              textShadow: '0.16cqw 0.16cqw 0px rgba(0,0,0,0.25)',
              WebkitTextStroke: `0.52cqw ${COLORS.ac.darkBrown}`,
              paintOrder: 'stroke fill',
              WebkitPaintOrder: 'stroke fill',
              color: COLORS.ac.creamIvory,
            }}
          >
            <span className="relative z-10">회원가입</span>
          </div>

          <form onSubmit={handleJoin} className="mt-[2.08cqw] w-full flex flex-col gap-[1.04cqw] items-center">
            {/* 이메일 영역 */}
            <div className="flex items-center gap-[0.52cqw] w-[22.92cqw]">
              <input
                type="email"
                placeholder="이메일 주소"
                value={email}
                readOnly={isEmailVerified}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setIsEmailSent(false);
                }}
                className="flex-1 text-left pl-[1.67cqw] outline-none transition-all placeholder-opacity-100"
                style={{
                  height: '4.17cqw',
                  borderRadius: '2.08cqw',
                  backgroundColor: COLORS.ac.creamIvory,
                  fontSize: '1.25cqw',
                  color: COLORS.text,
                }}
              />
              {!isEmailVerified && (
                <button
                  type="button"
                  disabled={isSending}
                  onClick={handleSendVerification}
                  className="flex items-center justify-center font-bold text-[0.94cqw] active:scale-95 transition-all shadow-md"
                  style={{
                    width: '6.25cqw',
                    height: '4.17cqw',
                    borderRadius: '2.08cqw',
                    backgroundColor: isSending ? '#ccc' : COLORS.ac.coffeeBrown,
                    color: COLORS.ac.creamIvory,
                  }}
                >
                  {isSending ? '발송중' : isEmailSent ? '재발송' : '인증요청'}
                </button>
              )}
            </div>

            {/* 인증번호 */}
            {isEmailSent && !isEmailVerified && (
              <div className="flex items-center gap-[0.52cqw] w-[22.92cqw] animate-in slide-in-from-top-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="인증번호 6자리"
                    value={authCode}
                    onChange={(e) => setAuthCode(e.target.value)}
                    className="w-full text-left pl-[1.67cqw] outline-none transition-all placeholder-opacity-100"
                    style={{
                      height: '4.17cqw',
                      borderRadius: '2.08cqw',
                      backgroundColor: COLORS.ac.creamIvory,
                      fontSize: '1.25cqw',
                      color: COLORS.text,
                    }}
                    maxLength={6}
                  />
                  <span
                    className={`absolute right-[1.25cqw] top-1/2 -translate-y-1/2 font-bold text-[0.94cqw] ${timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-[#8b5a2b]'}`}
                  >
                    {formatTime(timeLeft)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleVerifyCode}
                  className="flex items-center justify-center font-bold text-[0.94cqw] active:scale-95 transition-all shadow-md"
                  style={{
                    width: '6.25cqw',
                    height: '4.17cqw',
                    borderRadius: '2.08cqw',
                    backgroundColor: COLORS.ac.coffeeBrown,
                    color: COLORS.ac.creamIvory,
                  }}
                >
                  확인
                </button>
              </div>
            )}

            {/* 비밀번호 */}
            <div className="relative w-[22.92cqw]">
              <input
                type="password"
                placeholder="비밀번호를 입력하세요"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-left pl-[1.67cqw] outline-none transition-all placeholder-opacity-100"
                style={{
                  height: '4.17cqw',
                  borderRadius: '2.08cqw',
                  backgroundColor: COLORS.ac.creamIvory,
                  fontSize: '1.25cqw',
                  color: COLORS.text,
                }}
              />
            </div>

            {/* 비밀번호 확인 */}
            <div className="relative w-[22.92cqw]">
              <input
                type="password"
                placeholder="비밀번호 확인"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full text-left pl-[1.67cqw] outline-none transition-all placeholder-opacity-100"
                style={{
                  height: '4.17cqw',
                  borderRadius: '2.08cqw',
                  backgroundColor: COLORS.ac.creamIvory,
                  fontSize: '1.25cqw',
                  color: COLORS.text,
                }}
              />
            </div>

            {/* 닉네임 */}
            <div className="flex items-center gap-[0.52cqw] w-[22.92cqw]">
              <input
                type="text"
                placeholder="닉네임 입력하기"
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value);
                  setIsNicknameChecked(false);
                }}
                className="flex-1 text-left pl-[1.67cqw] outline-none transition-all placeholder-opacity-100"
                style={{
                  height: '4.17cqw',
                  borderRadius: '2.08cqw',
                  backgroundColor: COLORS.ac.creamIvory,
                  fontSize: '1.25cqw',
                  color: COLORS.text,
                }}
              />
              <button
                type="button"
                onClick={handleCheckNickname}
                className="flex items-center justify-center font-bold text-[0.94cqw] active:scale-95 transition-all shadow-md"
                style={{
                  width: '6.25cqw',
                  height: '4.17cqw',
                  borderRadius: '2.08cqw',
                  backgroundColor: COLORS.ac.coffeeBrown,
                  color: COLORS.ac.creamIvory,
                }}
              >
                중복체크
              </button>
            </div>

            {/* 가입 완료 버튼 */}
            <button
              type="submit"
              className="mt-[1.04cqw] flex items-center justify-center text-[1.67cqw] font-black active:scale-95 transition-transform shadow-lg hover:brightness-110"
              style={{
                width: '22.92cqw',
                height: '4.58cqw',
                borderRadius: '2.29cqw',
                backgroundColor: COLORS.ac.coffeeBrown,
                color: COLORS.ac.creamIvory,
                paintOrder: 'stroke fill',
                WebkitPaintOrder: 'stroke fill',
              }}
            >
              <span className="relative z-10" style={{ paddingBottom: '0.16cqw' }}>
                주민 가입 완료!
              </span>
            </button>
          </form>

          <div
            className="mt-[1.56cqw] font-bold text-[0.73cqw] underline cursor-pointer"
            style={{
              color: COLORS.ac.darkBrown,
              textDecoration: 'none',
            }}
          >
            <Link to="/">
              이미 주민이신가요?<span style={{ textDecoration: 'underline' }}> 로그인하러 가기</span>
            </Link>
          </div>
        </div>

        {/* 스타일 적용 (플레이스홀더) */}
        <style>{`
            input::placeholder {
                color: ${COLORS.text};
                opacity: 1;
            }
        `}</style>

        {/* 데코레이션 이미지 */}
        <div
          className="absolute bottom-[2.6cqw] left-[2.6cqw] w-[8.33cqw] h-[8.33cqw] bg-contain bg-no-repeat opacity-80 pointer-events-none"
          style={{ backgroundImage: "url('/images/isabelle.png')" }}
        ></div>
      </div>
    </AspectLayout>
  );
}
