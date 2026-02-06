import React, { useMemo } from 'react';
import { COLORS, withAlpha } from '../../constants/colors.js';

const BASE = { board: '/images/board' };

const IMG = {
  mupani: `${BASE.board}/icon-mupani.webp`,
};

export default function TurnCounter({
                                      currentRound,
                                      totalRounds,
                                      radishPrice,
                                      radishGuideText,
                                    }) {
  const roundText = String(currentRound ?? 1);
  const totalText = String(totalRounds ?? 20);

  const radishText = useMemo(() => {
    if (typeof radishPrice === 'number') return `무: ${radishPrice}벨`;
    return '무: -';
  }, [radishPrice]);

  // 공통 색상/스트로크 스타일
  const white = COLORS.ac.white;
  const strokeColor = withAlpha(COLORS.ac.black, 0.2);

  // 1920 기준 4px 스트로크( cqw 변환 )
  const stroke20 = useMemo(
    () => ({
      WebkitTextStroke: `0.2083cqw ${strokeColor}`,
      paintOrder: 'stroke fill',
    }),
    [strokeColor]
  );

  // 무 시세 UI 색상
  const iconBg = withAlpha(COLORS.ac.white, 0.3);
  const priceBg = withAlpha(COLORS.ac.black, 0.3);
  const guideColor = withAlpha(COLORS.ac.white, 0.88);

  return (
    <>
      {/* 라운드 UI */}
      <div
        aria-label="라운드 표시"
        style={{
          position: 'absolute',
          top: '2.5926cqh',
          right: '1.4583cqw',
          width: '6.25cqw',
          textAlign: 'center',
          zIndex: 13000,
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-gosanja)',
            fontSize: '1.25cqw',
            lineHeight: '1.25cqw',
            marginBottom: '0.7407cqh',
            color: white,
            ...stroke20,
          }}
        >
          라운드
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'baseline',
            gap: '0.4167cqw',
          }}
        >
          <span
            className="f1"
            style={{
              fontFamily: 'var(--font-formula)',
              fontSize: '2.0833cqw',
              lineHeight: '2.0833cqw',
              color: white,
              ...stroke20,
            }}
          >
            {roundText}
          </span>

          <span
            style={{
              fontFamily: 'var(--font-gosanja)',
              fontSize: '1.0417cqw',
              lineHeight: '1.0417cqw',
              color: white,
              ...stroke20,
            }}
          >
            /
          </span>

          <span
            className="f1"
            style={{
              fontFamily: 'var(--font-formula)',
              fontSize: '1.25cqw',
              lineHeight: '1.25cqw',
              color: white,
              ...stroke20,
            }}
          >
            {totalText}
          </span>
        </div>
      </div>

      {/* 무 시세 UI */}
      <div
        aria-label="무 시세 표시"
        style={{
          position: 'absolute',
          top: '12.9630cqh',
          right: '1.4583cqw',
          width: '5.2083cqw',
          zIndex: 12999,
          userSelect: 'none',
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.9259cqh',
        }}
      >
        {/* 무파니 아이콘 */}
        <div
          aria-hidden="true"
          style={{
            width: '5.2083cqw',
            height: '9.2593cqh',
            borderRadius: '99cqw',
            background: iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src={IMG.mupani}
            alt=""
            draggable={false}
            style={{
              height: '4.1667cqw',
              width: 'auto',
              objectFit: 'contain',
            }}
          />
        </div>

        {/* 무 가격 텍스트 */}
        <div
          style={{
            width: '5.2083cqw',
            height: '2.5926cqh',
            borderRadius: '99cqw',
            background: priceBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-gosanja)',
            fontSize: '0.8333cqw',
            lineHeight: '0.8333cqw',
            color: white,
          }}
        >
          {radishText}
        </div>

        {/* 무 시세 가이드 문구 */}
        {radishGuideText ? (
          <div
            style={{
              marginTop: '0.1852cqh',
              fontFamily: 'var(--font-gosanja)',
              fontSize: '0.625cqw',
              color: guideColor,
              textAlign: 'center',
              whiteSpace: 'nowrap',
            }}
          >
            {radishGuideText}
          </div>
        ) : null}
      </div>
    </>
  );
}
