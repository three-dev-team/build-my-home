import React, { useState } from 'react';
import InstructionText from '../../../components/common/InstructionText.jsx';
import { COLORS } from '../../../constants/colors.js';

export default function HouseStep0({ isMyTurn, character, px, onInventory, onATM, onOpenNaugul }) {
  const [isNaugulHover, setIsNaugulHover] = useState(false);

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

  const handleInventory = () => {
    if (!isMyTurn) return;
    if (typeof onInventory === 'function') onInventory();
  };

  const handleATM = () => {
    if (!isMyTurn) return;
    if (typeof onATM === 'function') onATM();
  };

  const canHover = isMyTurn;

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
        }}
      >
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
            }}
          />
        ) : null}
      </div>

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
