import { useState, useEffect, useRef } from 'react';

/**
 * 2시간 이상 플레이 경고 훅
 * JWT의 lastLoginAt을 기준으로 2시간 경과 시 true 반환
 */
export default function usePlayTimeWarning(warningMinutes = 120) {
  const [showWarning, setShowWarning] = useState(false);
  const [playMinutes, setPlayMinutes] = useState(0);
  const intervalRef = useRef(null);
  const lastWarningMultiple = useRef(0);

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (!token) return;

    // JWT 파싱 (페이로드 추출)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const lastLoginAt = payload.lastLoginAt;

      if (!lastLoginAt) return;

      const checkPlayTime = () => {
        const loginTime = new Date(lastLoginAt);
        const now = new Date();
        const diffMs = now - loginTime;
        const diffMinutes = Math.floor(diffMs / 60000);

        setPlayMinutes(diffMinutes);

        // 현재 도달한 배수
        const currentMultiple = Math.floor(diffMinutes / warningMinutes);

        // 새로운 배수에 도달했을 때만 경고
        if (currentMultiple > 0 && currentMultiple > lastWarningMultiple.current) {
          lastWarningMultiple.current = currentMultiple;
          setShowWarning(true);
        }
      };

      // 초기 체크
      checkPlayTime();

      // 1분마다 체크
      intervalRef.current = setInterval(checkPlayTime, 60000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    } catch (e) {
      console.error('JWT 파싱 오류:', e);
    }
  }, [warningMinutes]);

  const dismissWarning = () => {
    setShowWarning(false);
  };

  return { showWarning, playMinutes, dismissWarning };
}
