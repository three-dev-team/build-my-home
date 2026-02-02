import React, { useMemo } from 'react';

const ICON_MUPANI = '/images/board/icon-mupani.webp';

export default function TurnCounter({
                                      currentRound,
                                      totalRounds,
                                      radishPrice,
                                      radishQty,
                                      radishGuideText,
                                    }) {
  const roundText = String(currentRound ?? 1);
  const totalText = String(totalRounds ?? 20);

  const radishText = useMemo(() => {
    if (typeof radishPrice === 'number') return `무: ${radishPrice}벨`;
    return '무: -';
  }, [radishPrice]);

  // 1920 기준 4px stroke
  const stroke20 = useMemo(
    () => ({
      WebkitTextStroke: '0.2083cqw rgba(0,0,0,0.20)',
      paintOrder: 'stroke fill',
    }),
    []
  );

  const white = '#FFFFFF';

  return (
    <>
      {/* 라운드 */}
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

      {/* 무 시세 */}
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
        {/* 아이콘 */}
        <div
          aria-hidden="true"
          style={{
            width: '5.2083cqw',
            height: '9.2593cqh',
            borderRadius: '99cqw',
            background: 'rgba(255,255,255,0.30)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src={ICON_MUPANI}
            alt=""
            draggable={false}
            style={{
              height: '4.1667cqw',
              width: 'auto',
              objectFit: 'contain',
            }}
          />
        </div>

        {/* 가격 */}
        <div
          style={{
            width: '5.2083cqw',
            height: '2.5926cqh',
            borderRadius: '99cqw',
            background: 'rgba(0,0,0,0.30)',
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

        {/* 보유 */}
        {typeof radishQty === 'number' && (
          <div
            style={{
              marginTop: '0.3704cqh',
              fontFamily: 'var(--font-gosanja)',
              fontSize: '0.7292cqw',
              color: 'rgba(255,255,255,0.92)',
              textAlign: 'center',
              whiteSpace: 'nowrap',
            }}
          >
            {`보유: ${radishQty}개`}
          </div>
        )}

        {/* 가이드 */}
        {radishGuideText ? (
          <div
            style={{
              marginTop: '0.1852cqh',
              fontFamily: 'var(--font-gosanja)',
              fontSize: '0.625cqw',
              color: 'rgba(255,255,255,0.88)',
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
