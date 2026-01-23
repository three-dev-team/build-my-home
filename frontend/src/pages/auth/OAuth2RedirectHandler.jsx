import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export default function OAuth2RedirectHandler() {
  const location = useLocation();
  const ranRef = useRef(false); // React StrictMode로 인한 중복 실행 방지

  useEffect(() => {
    // 1. 중복 실행 방지 로직
    if (ranRef.current) return;
    ranRef.current = true;

    // 2. URL 파라미터에서 데이터 추출
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const nickname = params.get('nickname');
    const bell = params.get('bell');
    const level = params.get('level');

    if (token) {
      try {
        /* 3. JWT 토큰 디코딩
                  URL 파라미터에 memberId가 없는 경우를 대비해
                  토큰의 Payload(두 번째 섹션)에서 직접 memberId를 추출합니다.
                */
        const base64Payload = token.split('.')[1];
        const payload = JSON.parse(atob(base64Payload));
        const memberId = payload.memberId;

        // 4. 세션 스토리지 저장 (로그인 정보 유지)
        sessionStorage.setItem('token', token);
        sessionStorage.setItem('memberId', memberId);
        try {
          sessionStorage.setItem('nickname', decodeURIComponent(nickname || '주민'));
        } catch (e) {
          console.error('Nickname decoding failed:', e);
          sessionStorage.setItem('nickname', '주민');
        }
        sessionStorage.setItem('bell', bell || '0');
        sessionStorage.setItem('level', level || '1');

        // 5. 메인 화면으로 이동
        // 세션 정보가 확실히 반영되도록 강제 리다이렉트 방식을 사용합니다.
        window.location.href = '/home';
      } catch (error) {
        console.error('인증 처리 중 오류 발생:', error);
        window.location.href = '/'; // 오류 발생 시 로그인 페이지로 복귀
      }
    } else {
      // 토큰이 없는 경우 접근 차단
      window.location.href = '/';
    }
  }, [location]);

  return (
    <div className="w-full h-screen flex items-center justify-center bg-[#fdf6e3]">
      <div className="flex flex-col items-center gap-4">
        {/* 애니메이션 효과로 처리 중임을 알림 */}
        <div className="text-3xl animate-bounce">🍃</div>
        <div className="text-2xl font-black text-[#8b5a2b]">주민 등록증을 확인 중입니다...</div>
      </div>
    </div>
  );
}
