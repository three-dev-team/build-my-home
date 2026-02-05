import React, { useMemo } from 'react';
import './AtmCalculator.css';

// ✅ 네가 쓰는 공용 NumberPad 그대로 사용 (무파니에서도 쓰는 그거)
import NumberPad from '../../../components/common/NumberPad.jsx';

const fmt = (n) => Number(n || 0).toLocaleString();

export default function AtmCalculator({
                                        open = true,

                                        // 'LOAN' | 'REPAY'
                                        mode = 'LOAN',

                                        // NumberPad value
                                        value = 1,
                                        onChange,

                                        // 표시용 숫자
                                        loanRemain = 0, // LOAN: 남은 대출 가능액 / REPAY: 현재 대출금(표시용으로 그대로 사용)
                                        currentBell = 0,

                                        // NumberPad max
                                        max = 999999,

                                        // 버튼 텍스트
                                        confirmText = '결정',
                                        maxButtonText = '전액',

                                        // 결정
                                        onConfirm,

                                        // 입력칸 오른쪽 보조 문구
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
      <div className="atmCalc-title">{title}</div>

      {/* 상단 큰 박스 */}
      <div className="atmCalc-balanceBox">
        <div className="atmCalc-balanceRow">
          <div className="atmCalc-balanceLabel">대출 잔액</div>
          <div className="atmCalc-balanceValue">{fmt(loanRemain)}벨</div>
        </div>
        <div className="atmCalc-balanceRow">
          <div className="atmCalc-balanceLabel">현재 잔액</div>
          <div className="atmCalc-balanceValue">{fmt(currentBell)}벨</div>
        </div>
      </div>

      {/* 입력창 */}
      <div className="atmCalc-inputWrap">
        <div className="atmCalc-inputBox">
          <div className="atmCalc-inputText">{fmt(safeValue)}</div>
        </div>

        <div className="atmCalc-unitPill">벨</div>

        {helperText ? <div className="atmCalc-helper">{helperText}</div> : null}
      </div>

      {/* 키패드(갈색 영역) */}
      {/* ✅ atmPadSkin: NumberPad.css는 그대로 두고, ATM에서만 스킨 덮어쓰기 */}
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
