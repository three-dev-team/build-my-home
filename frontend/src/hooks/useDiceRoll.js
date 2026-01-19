import { useState, useEffect, useCallback } from 'react';

const useDiceRoll = ({ enabled = true, onRollComplete }) => {
    const [isRolling, setIsRolling] = useState(false);
    const [diceDisplay, setDiceDisplay] = useState(null);  // 애니메이션용

    const roll = useCallback(() => {
        if (isRolling || !enabled) return;

        setIsRolling(true);

        // 애니메이션용 랜덤 숫자 (실제 결과 아님)
        const rollInterval = setInterval(() => {
            setDiceDisplay(Math.floor(Math.random() * 6) + 1);
        }, 100);

        // 1초 후 서버에 요청
        setTimeout(() => {
            clearInterval(rollInterval);
            setIsRolling(false);
            onRollComplete?.();  // 값 안 보냄
        }, 1000);
    }, [isRolling, enabled, onRollComplete]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.code === 'Space') roll();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [roll]);

    const reset = useCallback(() => {
        setDiceDisplay(null);
        setIsRolling(false);
    }, []);

    return { isRolling, diceDisplay, roll, reset };
};

export default useDiceRoll;