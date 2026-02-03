import React from 'react';
import { COLORS } from '../../constants/colors.js';

const ExitButton = ({ onClick, className = '', label = '나가기', disabled = false }) => {
  // 16:9 캔버스 기준 스케일(1920px 기준)
  const s = 'calc(100cqw / 1920)';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={{
        position: 'absolute',
        right: '20px',
        bottom: '20px',
        zIndex: 9999,
        width: `calc(204 * ${s})`,
        height: `calc(62 * ${s})`,
        borderRadius: `calc(32 * ${s})`,
        background: COLORS.ac.creamIvory,
        border: 'none',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: `calc(20 * ${s})`,
        padding: 0,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <img
        src="/images/room/icon-arrow-back.svg"
        alt="back"
        draggable={false}
        style={{ width: `calc(40 * ${s})`, height: `auto`, flex: '0 0 auto' }}
      />
      <span
        style={{
          color: COLORS.ac.darkBrown,
          fontSize: `calc(32 * ${s})`,
          fontWeight: 700,
          lineHeight: 1,
          userSelect: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
    </button>
  );
};

export default ExitButton;
