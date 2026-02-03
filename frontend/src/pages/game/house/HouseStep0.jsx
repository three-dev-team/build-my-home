import React, { useState } from 'react';
import InstructionText from '../../../components/common/InstructionText.jsx';
import { COLORS } from '../../../constants/colors.js';

export default function HouseStep0({ isMyTurn, character, px, onInventory, onATM, onOpenNaugul }) {
  // 너굴 버튼 hover 상태(내 턴일 때만 시각 변화)
  const [isNaugulHover, setIsNaugulHover] = useState(false);

  // 공용 pill 버튼 스타일(인벤/ATM에 재사용)
  const pillBaseStyle = {
    paddingTop: px(16),
    paddingBottom: px(16),
    paddingLeft: px(40),
    paddingRight: px(40),
    fontSize: px(32),
    lineHeight: 1,
    borderRadius: px(999),
    background: COLORS.ac.creamWhite,
    color: COLORS.ac.darkBrown,
    fontFamily: 'var(--font-gosanja)',
    border: 'none',
  };

  // 인벤 클릭(내 턴일 때만)
  const handleInventory = () => {
    if (!isMyTurn) return;
    if (typeof onInventory === 'function') onInventory();
  };

  // ATM 클릭(내 턴일 때만)
  const handleATM = () => {
    if (!isMyTurn) return;
    if (typeof onATM === 'function') onATM();
  };

  // hover 효과는 내 턴일 때만 허용
  const canHover = isMyTurn;

  // 너굴 버튼 색상(hover 시 nookCyan/white, 기본 creamWhite/darkBrown)
  const naugulActive = canHover && isNaugulHover;
  const naugulBg = naugulActive ? COLORS.ac.nookCyan : COLORS.ac.creamWhite;
  const naugulText = naugulActive ? COLORS.ac.white : COLORS.ac.darkBrown;

  return (
    <>
      <button
        type="button"
        onClick={handleInventory}
        style={{
          ...pillBaseStyle,
          position: 'absolute',
          left: px(157),
          top: px(510),
          cursor: isMyTurn ? 'pointer' : 'not-allowed',
          opacity: isMyTurn ? 1 : 0.5,
        }}
      >
        인벤토리
      </button>

      <button
        type="button"
        onClick={() => isMyTurn && onOpenNaugul?.()}
        onMouseEnter={() => canHover && setIsNaugulHover(true)}
        onMouseLeave={() => setIsNaugulHover(false)}
        style={{
          position: 'absolute',
          left: px(706),
          top: px(195),
          width: px(139),
          height: px(65),
          borderRadius: px(999),
          background: naugulBg,
          color: naugulText,
          fontFamily: 'var(--font-gosanja)',
          fontSize: px(36),
          lineHeight: 1,
          border: 'none',
          cursor: isMyTurn ? 'pointer' : 'not-allowed',
          opacity: isMyTurn ? 1 : 0.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background-color 140ms ease, color 140ms ease',
        }}
      >
        너굴
      </button>

      <button
        type="button"
        onClick={handleATM}
        style={{
          ...pillBaseStyle,
          position: 'absolute',
          left: px(1659),
          top: px(530),
          cursor: isMyTurn ? 'pointer' : 'not-allowed',
          opacity: isMyTurn ? 1 : 0.5,
        }}
      >
        ATM
      </button>

      {/* 캐릭터 뒷모습 + 바닥 그림자(하우스 화면용 장식) */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          width: px(168),
          height: px(316),
          bottom: px(60),
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          zIndex: 2,
        }}
      >
        {/* 바닥 그림자 */}
        <div
          style={{
            width: '90%',
            height: px(40),
            background: 'rgba(0, 0, 0, 0.45)',
            borderRadius: '50%',
            position: 'absolute',
            bottom: px(-30),
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 0,
            filter: `blur(${px(6)})`,
          }}
        />

        {/* 캐릭터 이미지 */}
        {character?.backImage ? (
          <img
            src={character.backImage}
            alt="character"
            draggable={false}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              objectPosition: 'center bottom',
              display: 'block',
              position: 'relative',
              zIndex: 1,
            }}
          />
        ) : null}
      </div>

      {/* 안내 문구(클릭 아이콘 포함, 오버레이) */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <InstructionText>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: px(8) }}>
            원하는 옵션을 클릭하세요
            <img
              src="/images/board/icon-click.svg"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = '/images/board/icon-click.webp';
              }}
              alt="click"
              draggable={false}
              style={{
                width: px(36),
                height: px(36),
                display: 'inline-block',
                filter: 'brightness(0) invert(1)',
                transform: 'translateY(calc(-6 * var(--s)))',
              }}
            />
          </span>
        </InstructionText>
      </div>
    </>
  );
}
