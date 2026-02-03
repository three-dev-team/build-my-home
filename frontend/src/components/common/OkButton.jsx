import React from 'react';
import { COLORS } from '../../constants/colors.js';

const OkButton = ({ onClick, className = '', label = '확인', disabled = false, style = {} }) => {
  const s = 'calc(100cqw / 1920)';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={{
        position: 'absolute',
        right: `calc(20px + 204 * ${s} + 12px)`,
        bottom: '20px',
        zIndex: 9999,
        width: `calc(220 * ${s})`,
        height: `calc(62 * ${s})`,
        borderRadius: `calc(32 * ${s})`,
        background: COLORS.ac.nookCyan,
        border: 'none',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: `calc(12 * ${s})`,
        padding: 0,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style,
      }}
    >
      <svg
        viewBox="0 0 70 70"
        fill={COLORS.ac.creamWhite}
        style={{ width: `calc(32 * ${s})`, height: 'auto', flex: '0 0 auto' }}
      >
        <path d="M26.474,70c-2.176,0-4.234-1.018-5.557-2.764L3.049,43.639C0.725,40.57,1.33,36.2,4.399,33.875c3.074-2.326,7.441-1.717,9.766,1.35l11.752,15.518L55.474,3.285c2.035-3.265,6.332-4.264,9.604-2.232c3.268,2.034,4.266,6.334,2.23,9.602l-34.916,56.06c-1.213,1.949-3.307,3.175-5.6,3.279C26.685,69.998,26.58,70,26.474,70z" />
      </svg>
      <span
        style={{
          color: COLORS.ac.creamWhite,
          fontSize: `calc(32 * ${s})`,
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

export default OkButton;
