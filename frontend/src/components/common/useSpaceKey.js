import { useEffect, useRef } from 'react';

// 스페이스바 입력을 전역에서 감지해서 onSpace를 호출하는 훅
export default function useSpaceKey(onSpace, { enabled = true } = {}) {
  // 최신 콜백을 유지(이벤트 리스너 재등록 없이도 최신 함수 호출)
  const handlerRef = useRef(onSpace);

  useEffect(() => {
    handlerRef.current = onSpace;
  }, [onSpace]);

  useEffect(() => {
    if (!enabled) return;

    // keydown에서 스페이스바만 처리
    const onKeyDown = (e) => {
      if (e.code !== 'Space') return;

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

      handlerRef.current?.(e);
    };

    window.addEventListener('keydown', onKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
}
