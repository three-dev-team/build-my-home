// TurnCounter.jsx
import React from 'react';

// 아이콘(public 기준 경로)
const ICON_MUPANI = '/images/board/icon-mupani.png';

// 폰트 패밀리(@font-face 이름과 일치해야 적용됨)
const FONT_GOSANJA = '"Gosanja", system-ui, -apple-system, sans-serif';
const FONT_FORMULA = '"Formula", system-ui, -apple-system, sans-serif';

// px -> vw/vh 변환 (디자인 기준: 1920x1080)
const vw = (px) => `${(px / 1920) * 100}vw`;
const vh = (px) => `${(px / 1080) * 100}vh`;

// 라운드 텍스트 외곽선(검정 20%)
const STROKE_20 = {
  WebkitTextStroke: `${(4 / 1920) * 100}vw rgba(0,0,0,0.20)`,
  paintOrder: 'stroke fill',
};

// 기본 색상
const PURE_WHITE = '#FFFFFF';

// 고정 여백(가이드 기준)
const EDGE = 28;

// 라운드 블록 높이(가이드 합산)
const ROUND_BLOCK_H = 24 + 8 + 40;

// 라운드 블록과 무 아이콘 블록 사이 간격(가이드 기준)
const GAP_AFTER_ROUND = 40;

// 무 아이콘 블록 시작 top(가이드 기준)
const RADISH_BLOCK_TOP_PX = EDGE + ROUND_BLOCK_H + GAP_AFTER_ROUND;

const TurnCounter = ({ currentRound, totalRounds, radishPrice }) => {
  const roundText = String(currentRound ?? 1);
  const totalText = String(totalRounds ?? 20);

  // 무 가격 텍스트(무 가격 라인은 외곽선 미적용)
  const radishText = typeof radishPrice === 'number' ? `무: ${radishPrice}벨` : '무: -';

  return (
    <>
      {/* 라운드 표시 */}
      <div
        style={{
          position: 'fixed',
          top: vh(EDGE),
          right: vw(EDGE),
          width: vw(120),
          textAlign: 'center',
          zIndex: 13000,
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        {/* 라운드 라벨 */}
        <div
          style={{
            fontFamily: FONT_GOSANJA,
            fontSize: vw(24),
            lineHeight: vw(24),
            marginBottom: vh(8),
            color: PURE_WHITE,
            ...STROKE_20,
          }}
        >
          라운드
        </div>

        {/* 라운드 카운트(현재 / 전체) */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'baseline',
            gap: vw(8),
          }}
        >
          {/* 현재 라운드 */}
          <span
            style={{
              fontFamily: FONT_FORMULA,
              fontSize: vw(40),
              lineHeight: vw(40),
              color: PURE_WHITE,
              ...STROKE_20,
            }}
          >
            {roundText}
          </span>

          {/* 구분자 */}
          <span
            style={{
              fontFamily: FONT_GOSANJA,
              fontSize: vw(20),
              lineHeight: vw(20),
              color: PURE_WHITE,
              ...STROKE_20,
            }}
          >
            /
          </span>

          {/* 전체 라운드 */}
          <span
            style={{
              fontFamily: FONT_FORMULA,
              fontSize: vw(24),
              lineHeight: vw(24),
              color: PURE_WHITE,
              ...STROKE_20,
            }}
          >
            {totalText}
          </span>
        </div>
      </div>

      {/* 무 아이콘 + 무 가격 */}
      <div
        style={{
          position: 'fixed',
          top: vh(RADISH_BLOCK_TOP_PX),
          right: vw(EDGE),
          width: vw(100),
          zIndex: 12999,
          userSelect: 'none',
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: vh(10),
        }}
      >
        {/* 아이콘 원형 배경 */}
        <div
          style={{
            width: vw(100),
            height: vw(100), // 원형 유지(가로 기준으로 맞춤)
            borderRadius: vw(999),
            background: 'rgba(255,255,255,0.30)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src={ICON_MUPANI}
            alt="mupani"
            draggable={false}
            style={{
              height: vw(80),
              width: 'auto',
              objectFit: 'contain',
            }}
          />
        </div>

        {/* 무 가격 pill */}
        <div
          style={{
            width: vw(100),
            height: vh(28),
            borderRadius: vw(999),
            background: 'rgba(0,0,0,0.30)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: FONT_GOSANJA,
            fontSize: vw(16),
            lineHeight: vw(16),
            color: PURE_WHITE,
          }}
        >
          {radishText}
        </div>
      </div>
    </>
  );
};

export default TurnCounter;
