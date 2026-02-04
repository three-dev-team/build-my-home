// src/pages/game/radish/RadishSellInput.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import './RadishSellInput.css';
import { COLORS } from '../../../constants/colors.js';

const px = (n) => `calc(${n} * var(--s))`;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

const fmt = (n) => {
  const x = Number(n ?? 0);
  if (!Number.isFinite(x)) return '0';
  return x.toLocaleString('ko-KR');
};

export default function RadishSellInput({
                                          open = true,

                                          // 데이터
                                          radishPrice = 0,
                                          radishQty = 0,
                                          value = 1, // 판매할 개수(숫자)

                                          // 입력 변경
                                          onChange,

                                          // (임시) 엔터로 판매 확정하고 싶으면 연결
                                          onSubmit,
                                        }) {
  if (!open) return null;

  const maxQty = Math.max(0, Number(radishQty ?? 0));
  const canType = maxQty > 0;

  // 표시용 문자열(키패드 들어오기 전이라 키보드 입력만 지원)
  const [txt, setTxt] = useState(() => String(Number(value ?? 0) || 0));
  const inputRef = useRef(null);

  // 외부 value 동기화
  useEffect(() => {
    const v = Number(value ?? 0);
    if (!Number.isFinite(v)) return;
    setTxt(String(v));
  }, [value]);

  const unitPrice = useMemo(() => Number(radishPrice ?? 0), [radishPrice]);
  const unitPriceText = useMemo(() => fmt(unitPrice), [unitPrice]);

  const qtyNum = useMemo(() => {
    const n = Number(txt || 0);
    if (!Number.isFinite(n)) return 0;
    return clamp(n, 0, maxQty);
  }, [txt, maxQty]);

  const total = useMemo(() => qtyNum * unitPrice, [qtyNum, unitPrice]);
  const totalText = useMemo(() => fmt(total), [total]);

  // 입력 처리(숫자만)
  const applyText = (nextText) => {
    const raw = String(nextText ?? '');
    const digits = raw.replace(/[^\d]/g, '');
    const normalized = digits.replace(/^0+(?=\d)/, ''); // 앞 0 정리
    const safe = normalized === '' ? '0' : normalized;

    // max clamp
    const n = clamp(Number(safe || 0), 0, maxQty);
    const finalText = String(n);

    setTxt(finalText);
    onChange?.(n);
  };

  const focusInput = () => {
    if (!canType) return;
    inputRef.current?.focus();
    inputRef.current?.select?.();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (typeof onSubmit === 'function') onSubmit(qtyNum);
    }
  };

  // ===== 이미지(요청: 2개만 사용) =====
  const UI_MAIN = '/images/board/ui-mupani-sell.webp';
  const UI_BADGE = '/images/board/ui-radish.webp';

  return (
    <div className="radishSellInput-root" aria-label="무 판매 수량 입력">
      {/* 메인 UI(말풍선/입력칸/합계 라인까지 포함된 배경) */}
      <img className="radishSellInput-ui" src={UI_MAIN} alt="" draggable={false} />

      {/* 타이틀: 1무에 97벨인데 얼마나 파실래요? (97만 하이라이트) */}
      <div className="radishSellInput-title" aria-hidden="true">
        <span>1무에 </span>
        <span className="radishSellInput-titleAccent">{unitPriceText}</span>
        <span>벨인데 얼마나 파실래요?</span>
      </div>

      {/* 오른쪽 상단: 보유 무(스펙 w200 h68 f52 / right92 / rotate2deg 느낌) */}
      <div className="radishSellInput-badge" aria-hidden="true">
        <img className="radishSellInput-badgeImg" src={UI_BADGE} alt="" draggable={false} />
        <div className="radishSellInput-badgeText">{fmt(maxQty)}</div>
      </div>

      {/* 가운데 입력 숫자(스펙 w180 h72 f72 / 중앙정렬) */}
      <button
        type="button"
        className="radishSellInput-qtyHit"
        onClick={focusInput}
        disabled={!canType}
        aria-label="판매할 무 개수 입력"
      >
        <span className="radishSellInput-qtyText">{fmt(qtyNum)}</span>
      </button>

      {/* 합계 금액(스펙 f48 / 오른쪽정렬 느낌) */}
      <div className="radishSellInput-total" aria-hidden="true">
        {totalText}벨
      </div>

      {/* 실제 입력(보이진 않지만 키보드 입력 담당) */}
      <input
        ref={inputRef}
        className="radishSellInput-hiddenInput"
        inputMode="numeric"
        pattern="[0-9]*"
        value={txt}
        onChange={(e) => applyText(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={!canType}
      />
    </div>
  );
}
