import React, { useEffect, useMemo, useState } from 'react';
import './NumberPad.css';
import { COLORS } from '../../constants/colors.js';

export default function NumberPad({
                                    value = 1,
                                    onChange,
                                    max = 999999,
                                    onConfirm,
                                    confirmText = '결정',
                                    maxButtonText = '전액',
                                  }) {
  const [isFirstInput, setIsFirstInput] = useState(true);

  useEffect(() => {
    setIsFirstInput(true);
  }, [max]);

  const clamp = (n) => Math.min(max, Math.max(1, n));

  const handleAddDigit = (digit) => {
    let next;
    if (isFirstInput) {
      next = digit;
      setIsFirstInput(false);
    } else {
      next = value * 10 + digit;
    }
    onChange?.(clamp(next));
  };

  const handleDelete = () => {
    setIsFirstInput(false);
    const next = Math.floor(value / 10);
    onChange?.(Math.max(1, next));
  };

  const handleClear = () => {
    setIsFirstInput(true);
    onChange?.(1);
  };

  const handleSetMax = () => {
    setIsFirstInput(false);
    onChange?.(max);
  };

  const theme = useMemo(() => COLORS?.numberPad || {}, []);

  return (
    <div
      className="atmNumpadRoot"
      style={{
        '--np-panel': theme.panel,
        '--np-key': theme.key,
        '--np-keyText': theme.keyText,
        '--np-clear': theme.clear,
        '--np-max': theme.max,
        '--np-backspace': theme.backspace,
        '--np-confirm': theme.confirm,
        '--np-creamWhite': theme.creamWhite,
      }}
    >
      <div className="atmNumpadPanel">
        <div className="atmNumpadGrid">
          {/* 1행 */}
          <button type="button" className="atmNumpadBtn btnClear" onClick={handleClear}>
            C
          </button>

          <button type="button" className="atmNumpadBtn btnMax" onClick={handleSetMax}>
            {maxButtonText}
          </button>

          {/* 1행 4열은 PSD상 빈칸이라 “스페이서”로 자리 고정 */}
          <div className="atmNumpadSpacer" aria-hidden="true" />

          {/* 2행 */}
          <button type="button" className="atmNumpadBtn btnNum key7" onClick={() => handleAddDigit(7)}>
            7
          </button>
          <button type="button" className="atmNumpadBtn btnNum key8" onClick={() => handleAddDigit(8)}>
            8
          </button>
          <button type="button" className="atmNumpadBtn btnNum key9" onClick={() => handleAddDigit(9)}>
            9
          </button>

          <button type="button" className="atmNumpadBtn btnDelete" onClick={handleDelete} aria-label="삭제">
            <span className="btnDeleteIcon" aria-hidden="true" />
          </button>

          {/* 3행 */}
          <button type="button" className="atmNumpadBtn btnNum key4" onClick={() => handleAddDigit(4)}>
            4
          </button>
          <button type="button" className="atmNumpadBtn btnNum key5" onClick={() => handleAddDigit(5)}>
            5
          </button>
          <button type="button" className="atmNumpadBtn btnNum key6" onClick={() => handleAddDigit(6)}>
            6
          </button>

          <button type="button" className="atmNumpadBtn btnConfirm" onClick={onConfirm}>
            {confirmText}
          </button>

          {/* 4행 */}
          <button type="button" className="atmNumpadBtn btnNum key1" onClick={() => handleAddDigit(1)}>
            1
          </button>
          <button type="button" className="atmNumpadBtn btnNum key2" onClick={() => handleAddDigit(2)}>
            2
          </button>
          <button type="button" className="atmNumpadBtn btnNum key3" onClick={() => handleAddDigit(3)}>
            3
          </button>

          {/* 5행 */}
          <button type="button" className="atmNumpadBtn btnZero key0" onClick={() => handleAddDigit(0)}>
            0
          </button>
        </div>
      </div>
    </div>
  );
}
