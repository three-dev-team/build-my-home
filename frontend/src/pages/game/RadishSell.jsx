// src/pages/game/RadishSell.jsx
import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import AspectLayout from '../../components/layout/AspectLayout.jsx';
import ExitButton from '../../components/common/ExitButton.jsx';
import InstructionText from '../../components/common/InstructionText.jsx';

const px = (n) => `calc(${n} * var(--s))`;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export default function RadishSell({ isMyTurn, radishQty = 0, radishPrice = 0, onSell, onClose }) {
  const canSell = !!isMyTurn && Number(radishQty) > 0 && typeof onSell === 'function';

  const [sellQty, setSellQty] = useState(1);

  const safeQty = useMemo(() => {
    const max = Math.max(1, Number(radishQty) || 1);
    return clamp(Number(sellQty) || 1, 1, max);
  }, [sellQty, radishQty]);

  const expected = useMemo(() => {
    if (typeof radishPrice !== 'number') return 0;
    return safeQty * radishPrice;
  }, [safeQty, radishPrice]);

  const handleSell = () => {
    if (!canSell) return;
    onSell(safeQty);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[30000]">
      <AspectLayout>
        <div
          className="relative w-full h-full overflow-hidden"
          style={{
            containerType: 'size',
            ['--s']: 'calc(100cqw / 1920)',
          }}
        >
          {/* ✅ (원하면) House처럼 배경 이미지 깔기 */}
          {/* <img src="/images/board/bg-mupani.webp" className="absolute inset-0 w-full h-full object-cover" /> */}

          {/* ✅ 중앙 패널 */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: px(900),
              borderRadius: px(24),
              background: '#FFFBF0',
              padding: px(48),
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            }}
          >
            <h2 style={{ fontSize: px(42), fontWeight: 900, color: '#594E36', marginBottom: px(28) }}>
              무 판매
            </h2>

            <div style={{ fontSize: px(26), color: '#594E36', lineHeight: 1.6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 900 }}>보유 무</span>
                <span style={{ fontWeight: 900 }}>{Number(radishQty) || 0}개</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 900 }}>현재 시세</span>
                <span style={{ fontWeight: 900 }}>
                  {typeof radishPrice === 'number' ? `${radishPrice}벨` : '-'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 900 }}>예상 판매액</span>
                <span style={{ fontWeight: 900 }}>{expected.toLocaleString()}벨</span>
              </div>
            </div>

            {/* 수량 +/- */}
            <div style={{ marginTop: px(36), display: 'flex', justifyContent: 'center', gap: px(18) }}>
              <button
                type="button"
                disabled={!canSell}
                onClick={() => setSellQty((q) => clamp((Number(q) || 1) - 1, 1, Math.max(1, Number(radishQty) || 1)))}
                style={{
                  width: px(80),
                  height: px(80),
                  borderRadius: '50%',
                  background: '#E9E2D2',
                  fontSize: px(40),
                  fontWeight: 900,
                  opacity: canSell ? 1 : 0.5,
                }}
              >
                -
              </button>

              <div style={{ minWidth: px(140), textAlign: 'center', fontSize: px(46), fontWeight: 900, color: '#594E36' }}>
                {safeQty}
              </div>

              <button
                type="button"
                disabled={!canSell}
                onClick={() => setSellQty((q) => clamp((Number(q) || 1) + 1, 1, Math.max(1, Number(radishQty) || 1)))}
                style={{
                  width: px(80),
                  height: px(80),
                  borderRadius: '50%',
                  background: '#E9E2D2',
                  fontSize: px(40),
                  fontWeight: 900,
                  opacity: canSell ? 1 : 0.5,
                }}
              >
                +
              </button>
            </div>

            {/* 버튼 */}
            <div style={{ marginTop: px(36), display: 'flex', gap: px(18) }}>
              <button
                type="button"
                onClick={handleSell}
                disabled={!canSell}
                style={{
                  flex: 1,
                  borderRadius: px(28),
                  background: '#594E36',
                  color: '#FFFBF0',
                  padding: `${px(18)} ${px(16)}`,
                  fontSize: px(28),
                  fontWeight: 900,
                  opacity: canSell ? 1 : 0.5,
                }}
              >
                판매하기
              </button>

              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1,
                  borderRadius: px(28),
                  background: '#E9E2D2',
                  color: '#594E36',
                  padding: `${px(18)} ${px(16)}`,
                  fontSize: px(28),
                  fontWeight: 900,
                }}
              >
                돌아가기
              </button>
            </div>

            {!isMyTurn && (
              <p style={{ marginTop: px(18), fontSize: px(22), color: '#594E36', textAlign: 'center' }}>
                지금은 내 차례가 아니라 판매할 수 없어.
              </p>
            )}

            {Number(radishQty) <= 0 && (
              <p style={{ marginTop: px(18), fontSize: px(22), color: '#594E36', textAlign: 'center' }}>
                보유한 무가 없어.
              </p>
            )}
          </div>

          {/* ✅ House처럼 ExitButton absolute로 */}
          <ExitButton
            onClick={onClose}
            label="뒤로가기"
            showShadow={false}
            disabled={false}
            style={{
              position: 'absolute',
              right: px(30),
              bottom: px(28),
              zIndex: 10,
            }}
          />

          <InstructionText>{`수량을 선택하고 판매하기를 누르세요 `}</InstructionText>
        </div>
      </AspectLayout>
    </motion.div>
  );
}
