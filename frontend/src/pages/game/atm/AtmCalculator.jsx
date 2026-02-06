import React, { useMemo } from 'react';
import './AtmCalculator.css';

import NumberPad from '../../../components/common/NumberPad.jsx';
import { COLORS, withAlpha } from '../../../constants/colors.js';

const fmt = (n) => Number(n || 0).toLocaleString();

export default function AtmCalculator({
                                        open = true,
                                        mode = 'LOAN',
                                        value = 0,
                                        onChange,
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
    return Number.isFinite(n) ? n : 0;
  }, [value]);

  const C = COLORS?.ac || {};
  const titleColor = C.green ?? '#43991a';
  const labelColor = withAlpha(C.green ?? '#179162', 0.95);
  const valueColor = withAlpha(C.green ?? '#60b635', 0.9);
  const inputColor = C.green ?? '#43991a';
  const unitColor = C.creamWhite ?? C.white ?? '#FFFFFF';

  if (!open) return null;

  return (
    <div
      className="atmCalc-root"
      style={{
        '--atm-title-color': titleColor,
        '--atm-label-color': labelColor,
        '--atm-value-color': valueColor,
        '--atm-input-color': inputColor,
        '--atm-unit-color': unitColor,
      }}
    >
      <div className="atmCalc-title">{title}</div>

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

      <div className="atmCalc-inputWrap">
        <div className="atmCalc-inputTextOnly">{fmt(safeValue)}</div>
        {helperText ? <div className="atmCalc-helper">{helperText}</div> : null}
      </div>

      <div className="atmCalc-padWrap atmPadSkin">
        <NumberPad
          value={Math.max(0, Number(safeValue || 0))}
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
