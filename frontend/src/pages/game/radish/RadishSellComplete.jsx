// RadishSellComplete.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';

import AutoMove from '../../../components/common/AutoMove.jsx';
import Subtitle from '../../../components/common/Subtitle.jsx';
import { COLORS } from '../../../constants/colors.js';

const fmt = (n) => {
  const x = Number(n ?? 0);
  if (!Number.isFinite(x)) return '0';
  return x.toLocaleString('ko-KR');
};

export default function RadishSellComplete({
                                             open = true,
                                             nameText = '콩돌',
                                             nameColor = COLORS?.characters?.naugul?.nameBox ?? COLORS.ac.nookCyan,
                                             nameTextColor = COLORS?.characters?.naugul?.nameText ?? COLORS.ac.darkBrown,
                                             soldQty = 0,
                                             soldAmount = 0,
                                             afterTypedExitMs = 3000,
                                             onExit,
                                           }) {
  if (!open) return null;

  const qtyText = useMemo(() => fmt(soldQty), [soldQty]);
  const amtText = useMemo(() => fmt(soldAmount), [soldAmount]);

  const [typedDone, setTypedDone] = useState(false);
  const exitTimerRef = useRef(null);

  useEffect(() => {
    setTypedDone(false);
    return () => {
      if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    };
  }, [open]);

  useEffect(() => {
    if (!typedDone) return;
    if (typeof onExit !== 'function') return;

    if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current);
    exitTimerRef.current = window.setTimeout(() => {
      onExit();
    }, Math.max(0, Number(afterTypedExitMs) || 0));

    return () => {
      if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    };
  }, [typedDone, onExit, afterTypedExitMs]);

  const highlights = useMemo(
    () => [
      { text: qtyText, color: COLORS.ac.nookCyan },
      { text: amtText, color: COLORS.ac.nookCyan },
    ],
    [qtyText, amtText],
  );

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 50000,
        pointerEvents: 'none',
      }}
    >
      <AutoMove />

      <div style={{ pointerEvents: 'none' }}>
        <Subtitle
          nameText={nameText}
          nameColor={nameColor}
          nameTextColor={nameTextColor}
          contentText={`싱싱한 무 ${qtyText}개를 매입했습니다! 매입했습니다-!\n정산 금액은 총 ${amtText}벨입니다.\n감사합니다! 합니다 -!`}
          highlights={highlights}
          contentColor={COLORS.subtitle.contentBox}
          contentTextColor={COLORS.subtitle.contentText}
          showTriangle
          options={[]}
          optionDisabled
          optionColor={COLORS.subtitle.optionBox}
          optionTextColor={COLORS.subtitle.optionText}
          onTypingComplete={() => setTypedDone(true)}
        />
      </div>
    </div>
  );
}
