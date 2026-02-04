import React from 'react';
import { COLORS } from '../../constants/colors.js';

const ExitButton = ({ onClick, className = '', label = '나가기', disabled = false }) => {
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
        background: COLORS.ac.creamWhite,
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
      <svg
        viewBox="0 0 16 16"
        fill={COLORS.ac.coffeeBrown}
        style={{ width: `calc(40 * ${s})`, height: 'auto', flex: '0 0 auto' }}
      >
        <path d="M8,4.809V2.25c0-0.256-0.098-0.512-0.293-0.708C7.512,1.347,7.256,1.25,7,1.25S6.488,1.347,6.293,1.542L0,7.75l6.293,6.207C6.488,14.152,6.744,14.25,7,14.25s0.512-0.098,0.707-0.293S8,13.505,8,13.25v-2.489c2.75,0.068,5.755,0.566,8,3.989v-1C16,9.117,12.5,5.307,8,4.809z" />
      </svg>
      <span
        style={{
          color: COLORS.ac.coffeeBrown,
          fontSize: `calc(32 * ${s})`,
          fontWeight: 700,
          lineHeight: 1,
          userSelect: 'none',
          whiteSpace: 'nowrap',
          marginTop: `calc(8 * ${s})`,
          marginLeft: `calc(-8 * ${s})`,
        }}
      >
        {label}
      </span>
    </button>
  );
};

export default ExitButton;
