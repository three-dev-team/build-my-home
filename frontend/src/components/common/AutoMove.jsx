import React from 'react';
import { COLORS, withAlpha } from '../../constants/colors.js';

// <AutoMove /> 그냥 붙여도 16:9 캔버스(AspectLayout) 안에서 1920*1080 기준 px로 스케일
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
  const u = '(1cqh / 10.8)';

  return (
    <div
      className={className}
      role="status"
      aria-live="polite"
      style={{
        position: 'absolute',
        left: '50%',
        transform: 'translateX(-50%)',
        top: `calc(${topPx} * ${u})`,
        width: `calc(${widthPx} * ${u})`,
        height: `calc(${heightPx} * ${u})`,
        borderRadius: `calc(${radiusPx} * ${u})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: withAlpha(COLORS.ac.black, bgAlpha),
        color: textColor,
        fontFamily: 'var(--font-gosanja)',
        fontWeight: 600,
        letterSpacing: '-0.02em',
        fontSize: `calc(${fontPx} * ${u})`,
        lineHeight: 1,
        userSelect: 'none',
        pointerEvents: 'none',
        zIndex,
        ...style,
      }}
    >
      <span style={{ whiteSpace: 'nowrap' }}>{text}</span>
    </div>
  );
}
