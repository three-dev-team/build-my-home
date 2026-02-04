import React from 'react';
import { COLORS, withAlpha } from '../../constants/colors.js';

// import AutoMove from '../../components/common/AutoMove.jsx';
// <AutoMove open /> => 사용방법
export default function AutoMove({
                                   open = true,
                                   text = '잠시후 자동으로 이동합니다...',
                                   topPx = 72,
                                   widthPx = 400,
                                   heightPx = 80,
                                   radiusPx = 40,
                                   fontPx = 24,
                                   bgAlpha = 0.4,
                                   textColor = COLORS.ac.white,
                                   zIndex = 20000,
                                   className = '',
                                   style,
                                 }) {
  if (!open) return null;

  const s = 'var(--s, 1px)';

  return (
    <div
      className={className}
      role="status"
      aria-live="polite"
      style={{
        position: 'absolute',
        left: '50%',
        transform: 'translateX(-50%)',
        top: `calc(${topPx} * ${s})`,
        width: `calc(${widthPx} * ${s})`,
        height: `calc(${heightPx} * ${s})`,
        borderRadius: `calc(${radiusPx} * ${s})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: withAlpha(COLORS.ac.black, bgAlpha),
        color: textColor,
        fontFamily: 'var(--font-gosanja)',
        fontWeight: 600,
        letterSpacing: '-0.02em',
        fontSize: `calc(${fontPx} * ${s})`,
        lineHeight: 1,
        userSelect: 'none',
        pointerEvents: 'none',
        zIndex,
        ...style,
      }}
    >
      <span
        style={{
          whiteSpace: 'nowrap',
        }}
      >
        {text}
      </span>
    </div>
  );
}
