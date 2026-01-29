import { useRef } from 'react';

export const useExitHandler = (isMyTurn, onExit) => {
  const hasExited = useRef(false);

  return () => {
    if (!isMyTurn) return;
    if (hasExited.current) return;
    hasExited.current = true;
    onExit();
  };
};
