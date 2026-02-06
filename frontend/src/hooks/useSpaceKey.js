import { useEffect, useRef } from 'react';

// 스페이스바 입력을 전역에서 감지해서 onSpace를 호출하는 훅
export default function useSpaceKey(onSpace, { enabled = true } = {}) {
  // 최신 콜백을 유지(이벤트 리스너 재등록 없이도 최신 함수 호출)
  const handlerRef = useRef(onSpace);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    handlerRef.current = onSpace;
  }, [onSpace]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return; // enabled가 false면 리스너 안 달음

    // keydown에서 스페이스바만 처리
    const onKeyDown = (e) => {
      if (e.code !== 'Space') return;
      if (!enabledRef.current) return; // ref로 즉시 체크

      // 입력 중(input/textarea/contenteditable)에는 방해하지 않음
      const tag = (e.target?.tagName || '').toLowerCase();
      const isEditable =
        tag === 'input' ||
        tag === 'textarea' ||
        e.target?.isContentEditable;

      if (isEditable) return;

      // 스크롤/버튼 포커스 등 기본 동작 차단
      e.preventDefault();
      e.stopPropagation();

      enabledRef.current = false; // 즉시 잠금 (연타 방어)
      handlerRef.current?.(e);
    };

    window.addEventListener('keydown', onKeyDown, { passive: false }); // 리스너 등록
    return () => window.removeEventListener('keydown', onKeyDown); // 리스너 제거
  }, [enabled]);
}
