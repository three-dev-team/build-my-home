// hooks/useGameTimer.js
// UI 표시용 카운트다운 타이머 훅
import { useState, useEffect } from 'react';

/**
 * @param {number} timeOutSeconds - 각 칸(이벤트)마다 설정하고 싶은 제한 시간
 * @param {function} onTimeOut - 시간이 다 되었을 때 자동으로 실행할 함수
 */

// 단순히 카운트다운만 함 (액션 처리 X)
export const useGameTimer = (timeOutSeconds, onTimeOut) => {
    // 넘겨받은 seconds로 초기화
    const [timeLeft, setTimeLeft] = useState(timeOutSeconds);

    useEffect(() => {
        // 시간이 0으로 설정된 상태면 타이머 작동 X
        if (timeOutSeconds <= 0) return;

        // GameStatus(게임 페이지별) 타이머 값 초기화 (예: KK 20초, 낚시: 30초 등)
        setTimeLeft(timeOutSeconds);

        // 1초씩 줄어듬
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    if (onTimeOut) onTimeOut();  // 시간이 다 되었을 때 실행할 함수
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [timeOutSeconds]);

    return {
        timeLeft,
        isUrgent: timeLeft > 0 && timeLeft <= 5,    // 5초 이하일 때 긴급 상태
        hasTimeOutPanel: timeOutSeconds > 0         // UI를 보여줄지 말지 결정하는 변수
    };
};