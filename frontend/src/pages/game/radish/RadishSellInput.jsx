import React, { useMemo } from 'react';
import './RadishSellInput.css';

import NumberPad from '../../../components/common/NumberPad.jsx';
import { COLORS, withAlpha } from '../../../constants/colors.js';

const fmt = (n) => Number(n || 0).toLocaleString();

export default function RadishSellInput({
                                          open = true,
                                          price = 0,
                                          maxQty = 1,
                                          value = 1,
                                          onChange,
                                          onConfirm,
                                          canConfirm = true,
                                          confirmText = '결정',
                                          maxButtonText = '팔 수 있는 만큼',
                                          ownedQty = 0,
                                          topRightValue = '',

                                          // 관전자(비참여자) 입력 차단 스위치
                                          interactive = true,
                                        }) {
  // maxQty 최소 1 보장
  const safeMax = useMemo(() => Math.max(1, Number(maxQty || 1)), [maxQty]);

  // value를 1~safeMax로 보정
  const safeValue = useMemo(() => {
    const n = Number(value);
    if (!Number.isFinite(n)) return 1;
    return Math.max(1, Math.min(safeMax, n));
  }, [value, safeMax]);

  const priceNum = useMemo(() => Number(price || 0), [price]);
  const total = useMemo(() => safeValue * priceNum, [safeValue, priceNum]);

  // 우상단 수량: topRightValue 우선, 없으면 ownedQty
  const rightQtyText = topRightValue ? String(topRightValue) : fmt(ownedQty);

  if (!open) return null;

  return (
    <div
      className="mupaniSell-root"
      aria-disabled={!interactive}
      style={{
        ['--accentColor']: COLORS.ac.nookCyan,
        ['--ms-white']: COLORS.ac.white,
        ['--ms-titleText']: COLORS.ac.woodDark,
        ['--ms-shadow']: withAlpha(COLORS.ac.black, 0.25),

        // 관전자면 클릭/터치 완전 차단
        pointerEvents: interactive ? 'auto' : 'none',
      }}
    >
      <img className="mupaniSell-bubble" src="/images/board/ui-mupani-sell.webp" alt="" draggable={false} />

      <img className="mupaniSell-topRightImg" src="/images/board/ui-radish.webp" alt="" draggable={false} />

      <div className="mupaniSell-topRightQtyBox" aria-hidden="true">
        <div className="mupaniSell-topRightQty">{rightQtyText}</div>
      </div>

      <div className="mupaniSell-titleBox">
        <div className="mupaniSell-titleText">
          1무에 <span className="mupaniSell-accent">{fmt(priceNum)}벨</span>인데 얼마나 파실래요?
        </div>
      </div>

      <div className="mupaniSell-qtyText" aria-label="판매 수량">
        {fmt(safeValue)}
      </div>

      <div className="mupaniSell-sumValue" aria-label="합계 벨">
        {fmt(total)}벨
      </div>

      <NumberPad
        value={safeValue}
        onChange={(v) => {
          // 관전자면 입력 무시
          if (!interactive) return;
          onChange?.(Math.max(1, Math.min(safeMax, Number(v || 1))));
        }}
        max={safeMax}
        onConfirm={() => {
          // 관전자/확정불가면 무시
          if (!interactive) return;
          if (!canConfirm) return;
          onConfirm?.();
        }}
        confirmText={confirmText}
        maxButtonText={maxButtonText}
      />
    </div>
  );
}
