import React, { useMemo } from 'react';
import './AtmCalculator.css';

// ✅ 네가 쓰는 공용 NumberPad 그대로 사용
import NumberPad from '../../../components/common/NumberPad.jsx';

const fmt = (n) => Number(n || 0).toLocaleString();

export default function AtmCalculator({
                                        open = true,

                                        // 'LOAN' | 'REPAY'
                                        mode = 'LOAN',

                                        value = 0,
                                        onChange,

                                        // 표시용 숫자(지금은 둘 다 "현재 빚"으로 통일해서 내려줌)
                                        loanRemain = 0,
                                        currentBell = 0,

                                        max = 999999,

                                        confirmText = '결정',
                                        maxButtonText = '전액',

                                        onConfirm,

                                        helperText = '',
                                      }) {
  const title = mode === 'REPAY' ? '얼마나 상환하시겠습니까?' : '얼마나 대출하시겠습니까?';

  const safeValue = useMemo(() => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 1;
  }, [value]);

  if (!open) return null;

  return (
    <div className="atmCalc-root">
      {/* 제목 */}
      <div className="atmCalc-title">{title}</div>

      {/* ✅ 배경 이미지에 흰 “동그라미/알약”이 이미 있으니,
          여기서는 박스/색칠 하지 말고 텍스트만 정확히 올림 */}
      <div className="atmCalc-balanceLayer" aria-hidden="false">
        <div className="atmCalc-balanceRow">
          <div className="atmCalc-balanceLabel">대출 잔액</div>
          <div className="atmCalc-balanceValue">{fmt(loanRemain)}벨</div>
        </div>
        <div className="atmCalc-balanceRow">
          <div className="atmCalc-balanceLabel">현재 잔액</div>
          <div className="atmCalc-balanceValue">{fmt(currentBell)}벨</div>
        </div>
      </div>

      {/* 입력칸도 배경 이미지에 이미 테두리/알약이 있으니 “텍스트만” 올림 */}
      <div className="atmCalc-inputWrap">
        <div className="atmCalc-inputTextOnly">{fmt(safeValue)}</div>

        {helperText ? <div className="atmCalc-helper">{helperText}</div> : null}
      </div>

      {/* 키패드(갈색 영역) */}
      <div className="atmCalc-padWrap atmPadSkin">
        <NumberPad
          value={Math.max(1, Number(safeValue || 1))}
          onChange={(v) => onChange?.(Number(v))}
          max={Number(max || 0)}
          onConfirm={onConfirm}
          confirmText={confirmText}
          maxButtonText={maxButtonText}
        />
      </div>
    </div>
  );
}
