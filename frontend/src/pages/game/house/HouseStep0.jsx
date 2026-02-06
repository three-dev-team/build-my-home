import React, { useMemo, useState } from 'react';
import InstructionText from '../../../components/common/InstructionText.jsx';
import { COLORS, withAlpha } from '../../../constants/colors.js';

const IMG = {
  clickSvg: '/images/board/icon-click.svg',
  clickWebp: '/images/board/icon-click.webp',
};

export default function HouseStep0({ isMyTurn, character, px, onInventory, onATM, onOpenNaugul }) {
  const [isNaugulHover, setIsNaugulHover] = useState(false);

  const canHover = isMyTurn;
  const naugulActive = canHover && isNaugulHover;

  const naugulBg = naugulActive ? COLORS.ac.nookCyan : COLORS.ac.creamWhite;
  const naugulText = naugulActive ? COLORS.ac.white : COLORS.ac.darkBrown;

  const pillBg = COLORS.ac.creamWhite;
  const pillText = COLORS.ac.darkBrown;

  const shadow = useMemo(() => withAlpha(COLORS.ac.black, 0.45), []);

  const handleInventory = () => {
    if (!isMyTurn) return;
    onInventory?.();
  };

  const handleATM = () => {
    if (!isMyTurn) return;
    onATM?.();
  };

  const pillClass = `houseStep0Pill ${isMyTurn ? 'isEnabled' : 'isDisabled'}`;

  return (
    <>
      {/* CSS 변수로 컬러만 주입 (인라인은 좌표만 남김) */}
      <div
        style={{
          ['--house-pill-bg']: pillBg,
          ['--house-pill-text']: pillText,
          ['--house-shadow']: shadow,
        }}
      >
        <button
          type="button"
          onClick={handleInventory}
          className={pillClass}
          style={{ left: px(157), top: px(510) }}
        >
          인벤토리
        </button>

        <button
          type="button"
          onClick={() => isMyTurn && onOpenNaugul?.()}
          onMouseEnter={() => canHover && setIsNaugulHover(true)}
          onMouseLeave={() => setIsNaugulHover(false)}
          className={`houseStep0NaugulBtn ${isMyTurn ? 'isEnabled' : 'isDisabled'}`}
          style={{
            left: px(706),
            top: px(195),
            background: naugulBg,
            color: naugulText,
            cursor: isMyTurn ? 'pointer' : 'not-allowed',
            opacity: isMyTurn ? 1 : 0.5,
          }}
        >
          너굴
        </button>

        <button type="button" onClick={handleATM} className={pillClass} style={{ left: px(1659), top: px(530) }}>
          ATM
        </button>

        {/* 캐릭터 뒷모습 + 바닥 그림자 */}
        <div className="houseStep0CharacterWrap">
          <div className="houseStep0Shadow" />
          {character?.backImage ? (
            <img src={character.backImage} alt="character" draggable={false} className="houseStep0BackImg" />
          ) : null}
        </div>

        {/* 안내 문구 */}
        <div className="houseStep0InstructionLayer">
          <InstructionText>
            <span className="houseStep0InstructionInline">
              원하는 옵션을 클릭하세요
              <img
                src={IMG.clickSvg}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = IMG.clickWebp;
                }}
                alt="click"
                draggable={false}
                className="houseStep0ClickIcon"
              />
            </span>
          </InstructionText>
        </div>
      </div>
    </>
  );
}
