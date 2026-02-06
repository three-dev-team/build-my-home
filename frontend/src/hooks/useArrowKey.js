import { useEffect, useRef } from 'react';

/**
 * 좌우 방향키 입력을 감지하는 훅
 *
 * @param {Function} onLeft - ← 왼쪽 방향키 콜백
 * @param {Function} onRight - → 오른쪽 방향키 콜백
 * @param {Object} options
 * @param {boolean} options.enabled - 활성화 여부 (default: true)
 *
 * @example
 * useArrowKey(
 *   () => setValue((prev) => prev - 1),  // ← 왼쪽
 *   () => setValue((prev) => prev + 1),  // → 오른쪽
 *   { enabled: isMyTurn && !confirmed }
 * );
 */

export default function useArrowKey(onLeft, onRight, { enabled = true } = {}) {
  const leftRef = useRef(onLeft);
  const rightRef = useRef(onRight);
  const enabledRef = useRef(enabled);

  useEffect(() => { leftRef.current = onLeft; }, [onLeft]);
  useEffect(() => { rightRef.current = onRight; }, [onRight]);
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (e) => {
      if (!enabledRef.current) return;
      if (e.key === 'ArrowLeft') leftRef.current?.();
      if (e.key === 'ArrowRight') rightRef.current?.();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
}
