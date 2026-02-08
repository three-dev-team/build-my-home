import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { COLORS } from '../../constants/colors';
import AspectLayout from '../../components/layout/AspectLayout';
import AuthAlertModal from '../../components/common/AuthAlertModal';

// --- 소셜 아이콘 컴포넌트 ---
const GoogleIcon = () => (
  <svg width="3.75cqw" height="3.75cqw" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g filter="url(#filter0_d_1_2)">
      <path
        d="M28 13C29.9 13 31.7 13.7 33 14.9L38.4 9.5C35.6 6.9 32 5.3 28 5.3C19.3 5.3 11.9 10.8 9.2 18.5L15.5 23.4C17.4 17.4 22.3 13 28 13Z"
        fill="#EA4335"
      />
      <path
        d="M28 43C22.3 43 17.4 38.6 15.5 32.6L9.2 37.5C11.9 45.2 19.3 50.7 28 50.7C34.2 50.7 39.4 48.7 43.2 45.2L37.3 40.6C35.3 42 32.4 43 28 43Z"
        fill="#34A853"
      />
      <path
        d="M15.5 32.6C15 31.1 14.7 29.6 14.7 28C14.7 26.4 15 24.9 15.5 23.4L9.2 18.5C8.1 21.4 7.5 24.6 7.5 28C7.5 31.4 8.1 34.6 9.2 37.5L15.5 32.6Z"
        fill="#FBBC05"
      />
      <path
        d="M50 28C50 26.4 49.8 24.8 49.4 23.3H28V32H40.7C40.2 34.9 38.3 38.3 37.3 40.6L43.2 45.2C47 41.6 50 35.6 50 28Z"
        fill="#4285F4"
      />
    </g>
  </svg>
);

const KakaoIcon = () => (
  <svg width="3.75cqw" height="3.75cqw" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 3C6.477 3 2 6.918 2 11.75C2 14.932 4.062 17.729 7.16 19.16L5.972 23.362C5.875 23.704 6.297 23.951 6.578 23.714L11.516 19.553C11.676 19.563 11.837 19.568 12 19.568C17.523 19.568 22 15.65 22 10.818C22 5.986 17.523 3 12 3Z"
      fill="#371D1E"
    />
    <text
      x="12"
      y="12.5"
      textAnchor="middle"
      dominantBaseline="middle"
      fill="#FAE100"
      fontSize="6.5"
      fontWeight="900"
      fontFamily="sans-serif"
      style={{ letterSpacing: '-0.5px' }}
    >
      TALK
    </text>
  </svg>
);

const NaverIcon = () => (
  <svg width="3.75cqw" height="3.75cqw" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g filter="url(#filter0_d_1_4)">
      <path d="M16.4 16H24.8L33.2 28.5V16H39.6V40H31.2L22.8 27.5V40H16.4V16Z" fill="white" />
    </g>
  </svg>
);

const EyeIcon = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const EyeSlashIcon = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
    />
  </svg>
);

export default function Login() {
  const [memberId, setMemberId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const [showFindModal, setShowFindModal] = useState(false);
  const [findStep, setFindStep] = useState(1);
  const [findEmail, setFindEmail] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // --- 아이디 기억하기 상태 ---
  const [rememberId, setRememberId] = useState(false);

  // --- 비밀번호 찾기 기능 강화 상태 ---
  const [isSending, setIsSending] = useState(false); // 버튼 비활성화용
  const [timeLeft, setTimeLeft] = useState(0); // 타이머용(초)

  const [modal, setModal] = useState({ isOpen: false, message: '' });
  const alertSound = useMemo(() => new Audio('/sounds/alert_ding.mp3'), []);
  const API_BASE_URL = '/api/member';

  // 이미 토큰이 있다면 바로 홈으로 이동
  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (token) {
      const returnUrl = sessionStorage.getItem('returnUrl');
      if (returnUrl) {
        sessionStorage.removeItem('returnUrl');
        navigate(returnUrl);
      } else {
        navigate('/home');
      }
    }
  }, [navigate]);

  // --- 컴포넌트 로드 시 저장된 아이디 불러오기 ---
  useEffect(() => {
    const savedId = localStorage.getItem('savedMemberId');
    if (savedId) {
      setMemberId(savedId);
      setRememberId(true);
    }
  }, []);

  // --- URL 파라미터로 전달된 에러 처리 (OAuth2 정지 등) ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    if (error === 'suspended') {
      openAlert('정지된 계정입니다.\n\n운영 정책 위반으로 로그인이\n제한되었습니다.');
      // URL에서 에러 파라미터 제거
      window.history.replaceState({}, '', '/');
    }
  }, []);

  // --- 타이머 핸들러 ---
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
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
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
        // 1. id(memberId)를 추가로 받습니다.
        const { token, nickname, bell, level, id, role, profileImage, isSuspended, suspendedUntil } = response.data;

        if (rememberId) {
          localStorage.setItem('savedMemberId', memberId);
        } else {
          localStorage.removeItem('savedMemberId');
        }

        sessionStorage.setItem('token', token);
        sessionStorage.setItem('nickname', nickname);
        sessionStorage.setItem('bell', bell);
        sessionStorage.setItem('level', level);
        sessionStorage.setItem('role', role);
        if (profileImage) {
          sessionStorage.setItem('profileImage', profileImage);
        }
        // 정지 정보 저장
        sessionStorage.setItem('isSuspended', isSuspended ? 'true' : 'false');
        if (suspendedUntil) {
          sessionStorage.setItem('suspendedUntil', suspendedUntil);
        }

        openAlert(`${nickname}님 환영합니다!`);
        setTimeout(() => {
          const returnUrl = sessionStorage.getItem('returnUrl');
          if (returnUrl) {
            sessionStorage.removeItem('returnUrl');
            navigate(returnUrl);
          } else {
            navigate('/home');
          }
        }, 1500);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.response?.data || '';
      // 정지된 계정 에러 메시지 감지
      if (typeof errorMsg === 'string' && errorMsg.includes('정지된 계정')) {
        openAlert('정지된 계정입니다.\n\n운영 정책 위반으로 로그인이\n제한되었습니다.');
      } else {
        openAlert('로그인 정보를 확인해주세요.');
      }
    }
  };

  // 인증번호 발송 (중복 클릭 방지 추가)
  const handleSendCode = async () => {
    if (!findEmail) return openAlert('이메일을 입력해주세요!');
    setIsSending(true); // 버튼 비활성화 시작
    try {
      await axios.post(`${API_BASE_URL}/send-code`, { email: findEmail });
      openAlert('인증번호를 발송했습니다! \n메일함을 확인해주세요.');
      setFindStep(2);
      setTimeLeft(300); // 5분(300초) 설정
    } catch (error) {
      openAlert('등록되지 않은 주민이거나 \n발송 중 오류가 발생했습니다.');
    } finally {
      setIsSending(false); // 버튼 다시 활성화
    }
  };

  // 인증번호 검증 (시간 만료 체크 추가)
  const handleVerifyCode = async () => {
    if (!authCode) return openAlert('인증번호를 입력해주세요!');
    if (timeLeft <= 0) return openAlert('인증 시간이 만료되었습니다.\n다시 시도해주세요.');
    try {
      const response = await axios.post(`${API_BASE_URL}/verify-code`, {
        email: findEmail,
        code: authCode,
      });
      if (response.data === true) {
        openAlert('인증 성공!\n새로운 비밀번호를 설정해주세요.');
        setFindStep(3);
        setTimeLeft(0); // 타이머 종료
      } else {
        openAlert('인증번호가 일치하지 않습니다.');
      }
    } catch (error) {
      openAlert('검증 중 오류가 발생했습니다.');
    }
  };

  const handleResetPassword = async () => {
    const pwRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,16}$/;
    if (!pwRegex.test(newPassword))
      return openAlert('비밀번호 규칙을 확인해주세요!\n(8~16자, 영문/숫자/특수문자 포함)');
    if (newPassword !== confirmNewPassword) return openAlert('비밀번호가 일치하지 않습니다.');

    try {
      await axios.post(`${API_BASE_URL}/reset-password`, {
        email: findEmail,
        password: newPassword,
      });
      openAlert('비밀번호가 변경되었습니다! \n새로운 비밀번호로 로그인하세요.');
      setShowFindModal(false);
      setFindStep(1);
      setFindEmail('');
      setTimeLeft(0);
    } catch (error) {
      openAlert('재설정에 실패했습니다.');
    }
  };

  const handleSocialLogin = (provider) => {
    // window.location.href = `/oauth2/authorization/${provider}`;
    window.location.href = `/oauth2/authorization/${provider}`;
  };

  return (
    <AspectLayout>
      <div className="relative w-full h-full bg-cover bg-center flex items-center justify-center overflow-hidden font-gosanja bg-[url('/images/bg-pattern-1.png')]">
        {/* --- 커스텀 알림 모달 --- */}
        <AuthAlertModal
          isOpen={modal.isOpen}
          message={modal.message}
          onClose={() => setModal({ isOpen: false, message: '' })}
        />

        {/* --- 비밀번호 재설정 모달 (디자인 가이드 적용) --- */}
        {showFindModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div
              className="relative w-[27.08cqw] p-[2.08cqw] rounded-[4.17cqw] shadow-2xl flex flex-col items-center animate-in zoom-in-95 duration-200"
              style={{
                backgroundColor: '#FFFFFF', // 디자인상 흰색 배경
              }}
            >
              {/* Header: 비밀번호 찾기 + 닫기 버튼 */}
              <div className="w-full flex items-center justify-center relative mt-[0.42cqw] mb-[1.25cqw]">
                <span className="font-bold text-[1.46cqw]" style={{ color: COLORS.ac.darkBrown }}>
                  비밀번호 찾기
                </span>
                <button
                  onClick={() => {
                    setShowFindModal(false);
                    setFindStep(1);
                    setTimeLeft(0);
                  }}
                  className="absolute right-0 top-1/2 -translate-y-1/2 p-[0.42cqw] hover:opacity-70 transition-opacity"
                >
                  <span className="text-[1.25cqw] font-bold" style={{ color: COLORS.ac.darkBrown }}>
                    X
                  </span>
                </button>
              </div>

              {/* Content Body */}
              <div className="w-full flex flex-col items-center">
                {findStep === 1 && (
                  <>
                    <p
                      className="font-bold text-[1.04cqw] mb-[1.67cqw] text-center"
                      style={{ color: COLORS.ac.darkBrown }}
                    >
                      가입한 이메일 주소를 입력해주세요
                    </p>
                    <input
                      type="email"
                      placeholder="이메일 주소 입력"
                      value={findEmail}
                      onChange={(e) => setFindEmail(e.target.value)}
                      className="text-left pl-[1.67cqw] outline-none transition-all placeholder-opacity-50 mb-[1.25cqw]"
                      style={{
                        width: '20.83cqw',
                        height: '4.17cqw',
                        borderRadius: '2.08cqw',
                        backgroundColor: '#EBEBEB', // 회색 배경 예시
                        fontSize: '1.04cqw',
                        color: COLORS.text,
                        fontWeight: 'bold',
                      }}
                    />
                    <button
                      onClick={handleSendCode}
                      disabled={isSending}
                      className={`font-black text-[1.25cqw] active:scale-95 transition-all shadow-none hover:brightness-105 ${isSending ? 'opacity-70' : ''}`}
                      style={{
                        width: '20.83cqw',
                        height: '4.17cqw',
                        borderRadius: '2.08cqw',
                        backgroundColor: COLORS.ac.coffeeBrown,
                        color: COLORS.ac.creamIvory,
                      }}
                    >
                      {isSending ? '발송 중...' : '인증번호 발송하기'}
                    </button>
                  </>
                )}

                {findStep === 2 && (
                  <>
                    <div className="flex flex-col items-center mb-[1.25cqw] gap-[0.21cqw]">
                      <p className="font-bold text-[1.04cqw] text-center" style={{ color: COLORS.ac.darkBrown }}>
                        메일로 발송된
                        <br />
                        6자리 번호를 입력해주세요
                      </p>
                      {/* 타이머 */}
                      <span className="font-bold text-[1.25cqw]" style={{ color: COLORS.ac.red }}>
                        {formatTime(timeLeft)}
                      </span>
                    </div>

                    <input
                      type="text"
                      placeholder="인증 번호 6 자 리"
                      value={authCode}
                      onChange={(e) => setAuthCode(e.target.value)}
                      className="text-center outline-none transition-all placeholder-opacity-50 mb-[0.83cqw] tracking-widest"
                      style={{
                        width: '20.83cqw',
                        height: '4.17cqw',
                        borderRadius: '2.08cqw',
                        backgroundColor: '#EBEBEB',
                        fontSize: '1.04cqw',
                        color: COLORS.text,
                        fontWeight: 'bold',
                      }}
                      maxLength={6}
                    />

                    <button
                      onClick={handleVerifyCode}
                      className="font-black text-[1.46cqw] active:scale-95 transition-all shadow-none hover:brightness-105 mb-[0.83cqw]"
                      style={{
                        width: '20.83cqw',
                        height: '4.17cqw',
                        borderRadius: '2.08cqw',
                        backgroundColor: COLORS.ac.coffeeBrown,
                        color: COLORS.ac.creamIvory,
                      }}
                    >
                      인증하기
                    </button>

                    <button
                      onClick={handleSendCode}
                      disabled={isSending}
                      className="text-[0.83cqw] font-bold underline opacity-80 hover:opacity-100"
                      style={{ color: COLORS.ac.coffeeBrown }}
                    >
                      인증번호 재발송
                    </button>
                  </>
                )}

                {findStep === 3 && (
                  <>
                    <p
                      className="font-bold text-[1.04cqw] mb-[1.25cqw] text-center"
                      style={{ color: COLORS.ac.darkBrown }}
                    >
                      새 비밀번호를 입력해주세요
                    </p>
                    <input
                      type="password"
                      placeholder="새 비밀번호 (8~16자)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="text-center outline-none transition-all placeholder-opacity-50 mb-[0.63cqw]"
                      style={{
                        width: '20.83cqw',
                        height: '4.17cqw',
                        borderRadius: '2.08cqw',
                        backgroundColor: '#EBEBEB',
                        fontSize: '1.04cqw',
                        color: COLORS.text,
                        fontWeight: 'bold',
                      }}
                    />
                    <input
                      type="password"
                      placeholder="비밀번호 확인"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="text-center outline-none transition-all placeholder-opacity-50 mb-[1.25cqw]"
                      style={{
                        width: '20.83cqw',
                        height: '4.17cqw',
                        borderRadius: '2.08cqw',
                        backgroundColor: '#EBEBEB',
                        fontSize: '1.04cqw',
                        color: COLORS.text,
                        fontWeight: 'bold',
                      }}
                    />
                    <button
                      onClick={handleResetPassword}
                      className="font-black text-[1.25cqw] active:scale-95 transition-all shadow-none hover:brightness-105"
                      style={{
                        width: '20.83cqw',
                        height: '4.17cqw',
                        borderRadius: '2.08cqw',
                        backgroundColor: COLORS.ac.coffeeBrown,
                        color: COLORS.ac.creamIvory,
                      }}
                    >
                      변경 완료
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- 메인 로그인 박스 (디자인 적용됨) --- */}
        <div
          className="relative flex flex-col items-center pt-[3.13cqw]"
          style={{
            width: '29.17cqw',
            height: '40.63cqw',
            borderRadius: '4.17cqw',
            backgroundColor: COLORS.ac.softYellow,
          }}
        >
          {/* 타이틀 배지 "로그인" */}
          <div
            className="absolute -top-[2.29cqw] flex items-center justify-center text-white text-[2.5cqw] font-black tracking-widest"
            style={{
              width: '13.54cqw',
              height: '4.58cqw',
              borderRadius: '2.29cqw',
              backgroundColor: COLORS.ac.coffeeBrown,
              boxShadow: `0px 0.42cqw 0px ${COLORS.ac.darkBrown}`, // 3D 그림자 효과
              textShadow: '0.16cqw 0.16cqw 0px rgba(0,0,0,0.25)',
              WebkitTextStroke: `0.52cqw ${COLORS.ac.darkBrown}`,
              paintOrder: 'stroke fill',
              color: COLORS.ac.creamIvory,
              WebkitPaintOrder: 'stroke fill', // 사파리/크롬 지원
            }}
          >
            <span className="relative z-10">로그인</span>
          </div>

          {/* 입력 필드 */}
          <div className="flex flex-col gap-[1.04cqw] mt-[2.08cqw] w-full items-center">
            <div className="relative">
              <input
                type="text"
                onChange={(e) => setMemberId(e.target.value)}
                value={memberId}
                placeholder="아이디를 입력하세요"
                className="text-left pl-[1.67cqw] outline-none transition-all placeholder-opacity-100"
                style={{
                  width: '22.92cqw',
                  height: '4.58cqw',
                  borderRadius: '2.08cqw',
                  backgroundColor: COLORS.ac.creamIvory,
                  fontSize: '1.46cqw',
                  color: COLORS.text,
                }}
              />
              <style>{`
                      input::placeholder {
                          color: ${COLORS.text};
                          opacity: 1;
                      }
                   `}</style>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                onChange={(e) => setPassword(e.target.value)}
                value={password}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="비밀번호를 입력하세요"
                className="text-left pl-[1.67cqw] outline-none transition-all placeholder-opacity-100"
                style={{
                  width: '22.92cqw',
                  height: '4.58cqw',
                  borderRadius: '2.08cqw',
                  backgroundColor: COLORS.ac.creamIvory,
                  fontSize: '1.46cqw',
                  color: COLORS.text,
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-[1.25cqw] top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: COLORS.ac.coffeeBrown }}
              >
                {showPassword ? (
                  <EyeIcon className="w-[1.67cqw] h-[1.67cqw]" />
                ) : (
                  <EyeSlashIcon className="w-[1.67cqw] h-[1.67cqw]" />
                )}
              </button>
            </div>
          </div>

          {/* 아이디 기억하기 */}
          <div className="w-[22.92cqw] mt-[1.04cqw] pl-[0.83cqw] flex justify-start items-center">
            <label
              className="flex items-center gap-[0.63cqw] cursor-pointer group hover:scale-105 transition-transform"
              style={{ color: COLORS.ac.coffeeBrown }}
            >
              <input
                type="checkbox"
                checked={rememberId}
                onChange={(e) => setRememberId(e.target.checked)}
                className="w-[1.04cqw] h-[1.04cqw] cursor-pointer"
                style={{ accentColor: COLORS.ac.coffeeBrown }}
              />
              <span className="font-bold text-[0.83cqw] pt-[0.21cqw]">아이디 기억하기</span>
            </label>
          </div>

          {/* 로그인 버튼 */}
          <button
            onClick={handleLogin}
            className="mt-[1.56cqw] flex items-center justify-center text-[1.67cqw] font-black active:scale-95 transition-transform shadow-lg hover:brightness-110"
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
              로그인하기
            </span>
          </button>

          {/* 서브 버튼 (회원가입 / 비밀번호 찾기) */}
          <div className="flex gap-[1.25cqw] mt-[1.3cqw]">
            <Link to="/join">
              <div
                className="flex items-center justify-center text-white text-[1.04cqw] font-bold shadow-md active:scale-95 transition-transform hover:brightness-110"
                style={{
                  width: '10.83cqw',
                  height: '3.13cqw',
                  borderRadius: '1.56cqw',
                  backgroundColor: COLORS.ac.nookMint,
                  color: COLORS.ac.creamIvory,
                }}
              >
                회원가입
              </div>
            </Link>
            <button onClick={() => setShowFindModal(true)}>
              <div
                className="flex items-center justify-center text-white text-[1.04cqw] font-bold shadow-md active:scale-95 transition-transform hover:brightness-110"
                style={{
                  width: '10.83cqw',
                  height: '3.13cqw',
                  borderRadius: '1.56cqw',
                  backgroundColor: COLORS.ac.nookMint,
                  color: COLORS.ac.creamWhite,
                }}
              >
                비밀번호 찾기
              </div>
            </button>
          </div>

          {/* 소셜 로그인 구분선 */}
          <div className="w-[22.92cqw] flex items-center justify-center gap-[0.83cqw] mt-[1.82cqw] mb-[1.04cqw]">
            <div className="w-full border-t-[0.1cqw] border-dashed border-[#a67c52]/30"></div>
            <span
              className="text-[0.83cqw] font-bold whitespace-nowrap pt-[0.21cqw]"
              style={{ color: COLORS.ac.coffeeBrown }}
            >
              간편 로그인
            </span>
            <div className="w-full border-t-[0.1cqw] border-dashed border-[#a67c52]/30"></div>
          </div>

          {/* 소셜 아이콘 */}
          <div className="flex gap-[1.04cqw]">
            <button
              onClick={() => handleSocialLogin('google')}
              className="hover:scale-110 transition active:translate-y-1 flex items-center justify-center"
              style={{
                width: '3.75cqw',
                height: '3.75cqw',
                borderRadius: '1.04cqw',
                backgroundColor: '#FFFFFF',
                boxShadow: '0 0.21cqw 0.31cqw rgba(0,0,0,0.1)',
              }}
            >
              <div className="scale-75">
                <GoogleIcon />
              </div>
            </button>
            <button
              onClick={() => handleSocialLogin('kakao')}
              className="hover:scale-110 transition active:translate-y-1 flex items-center justify-center"
              style={{
                width: '3.75cqw',
                height: '3.75cqw',
                borderRadius: '1.04cqw',
                backgroundColor: '#FAE100',
                boxShadow: '0 0.21cqw 0.31cqw rgba(0,0,0,0.1)',
              }}
            >
              <div className="scale-75">
                <KakaoIcon />
              </div>
            </button>
            <button
              onClick={() => handleSocialLogin('naver')}
              className="hover:scale-110 transition active:translate-y-1 flex items-center justify-center"
              style={{
                width: '3.75cqw',
                height: '3.75cqw',
                borderRadius: '1.04cqw',
                backgroundColor: '#03C75A',
                boxShadow: '0 0.21cqw 0.31cqw rgba(0,0,0,0.1)',
              }}
            >
              <div className="scale-75">
                <NaverIcon />
              </div>
            </button>
          </div>
        </div>

        {/* 데코레이션 이미지 */}
        <div
          className="absolute bottom-[2.6cqw] left-[2.6cqw] w-[8.33cqw] h-[8.33cqw] bg-contain bg-no-repeat opacity-80 pointer-events-none"
          style={{ backgroundImage: "url('/images/isabelle.png')" }}
        ></div>
      </div>
    </AspectLayout>
  );
}
