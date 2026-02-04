import React, { useState, useEffect } from 'react';
import './NumberPad.css';

/**
 * NumberPad 컴포넌트
 * @param {number} value - 현재 입력된 값
 * @param {function} onChange - 값 변경 핸들러
 * @param {number} max - 최대값
 * @param {function} onConfirm - 결정 버튼 핸들러
 * @param {string} confirmText - 결정 버튼 텍스트 (기본: "결정")
 * @param {string} maxButtonText - 최대값 버튼 텍스트 (기본: "살 수 있는 만큼")
 */
export default function NumberPad({
  value = 1,
  onChange,
  max = 999999,
  onConfirm,
  confirmText = '결정',
  maxButtonText = '살 수 있는 만큼',
}) {
  // 첫 입력 여부 추적
  const [isFirstInput, setIsFirstInput] = useState(true);

  // value가 외부에서 변경되면 첫 입력 상태 리셋
  useEffect(() => {
    setIsFirstInput(true);
  }, [max]); // max가 변경되면 리셋 (새로운 상품 선택 등)

  // 숫자 추가
  const handleAddDigit = (digit) => {
    let newValue;

    if (isFirstInput) {
      newValue = digit;
      setIsFirstInput(false);
    } else {
      newValue = value * 10 + digit;
    }

    onChange(Math.min(max, Math.max(1, newValue)));
  };

  // 숫자 삭제 (백스페이스)
  const handleDelete = () => {
    setIsFirstInput(false); // 삭제하면 첫 입력 아님
    const newValue = Math.floor(value / 10);
    onChange(Math.max(1, newValue));
  };

  // 초기화
  const handleClear = () => {
    setIsFirstInput(true); // 초기화하면 다시 첫 입력 상태
    onChange(1);
  };

  // 최대값으로 설정
  const handleSetMax = () => {
    setIsFirstInput(false); // 최대값 설정하면 첫 입력 아님
    onChange(max);
  };

  return (
    <div className="numpad-wrapper">
      <div className="numpad-grid">
        {/* 1행: C, 살 수 있는 만큼, 공백 */}
        <button className="numpad-btn clear" onClick={handleClear}>
          C
        </button>
        <button className="numpad-btn max" onClick={handleSetMax}>
          {maxButtonText}
        </button>

        {/* 2행: 7, 8, 9, ⌫ */}
        <button className="numpad-btn" onClick={() => handleAddDigit(7)}>
          7
        </button>
        <button className="numpad-btn" onClick={() => handleAddDigit(8)}>
          8
        </button>
        <button className="numpad-btn" onClick={() => handleAddDigit(9)}>
          9
        </button>
        <button className="numpad-btn delete" onClick={handleDelete}>
          ⌫
        </button>


        {/* 3행: 4, 5, 6, 결정 */}
        <button className="numpad-btn" onClick={() => handleAddDigit(4)}>
          4
        </button>
        <button className="numpad-btn" onClick={() => handleAddDigit(5)}>
          5
        </button>
        <button className="numpad-btn" onClick={() => handleAddDigit(6)}>
          6
        </button>
        <button className="numpad-btn confirm confirm-start" onClick={onConfirm}>
          {confirmText}
        </button>


        {/* 4행: 1, 2, 3, (결정 계속) */}
        <button className="numpad-btn" onClick={() => handleAddDigit(1)}>
          1
        </button>
        <button className="numpad-btn" onClick={() => handleAddDigit(2)}>
          2
        </button>
        <button className="numpad-btn" onClick={() => handleAddDigit(3)}>
          3
        </button>

        {/* 5행: 0 (3칸), (결정) */}
        <button className="numpad-btn zero" onClick={() => handleAddDigit(0)}>
          0
        </button>
      </div>
    </div>
  );
}
