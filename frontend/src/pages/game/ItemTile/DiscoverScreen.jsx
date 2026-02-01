import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import InstructionText from '../../../components/common/InstructionText.jsx';
import useSpaceKey from '../../../components/common/useSpaceKey.js';

const toBool = (v) => v === true || v === 'true';

// 프리뷰(획득 버튼 누른 직후 잠깐 보여줄 이미지)
const PREVIEW_SRC = '/images/item/item-custom_dice.webp';

export default function DiscoverScreen({ isMyTurn, onAction, characterDeliveryImage, characterHappyImage }) {
  const myTurn = toBool(isMyTurn);
  const [pressed, setPressed] = useState(false);
  const timerRef = useRef(null);

  const runNext = useCallback(() => {
    if (!myTurn) return;
    if (pressed) return;

    setPressed(true);

    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      onAction('GET_RANDOM_ITEM', {});
    }, 120);
  }, [myTurn, pressed, onAction]);

  useSpaceKey(runNext, { enabled: myTurn });

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const img = pressed ? characterHappyImage : characterDeliveryImage;

  return (
    <motion.div
      className="itemtile-layer"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="itemtile-character-box" aria-hidden>
        <div className="itemtile-character-inner">
          {img ? <img src={img} alt="" draggable={false} /> : null}

          {pressed && (
            <motion.div
              className="itemtile-held-item"
              aria-hidden
              initial={{ scale: 0.6, opacity: 0, y: `calc(16 * var(--v))` }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <img src={PREVIEW_SRC} alt="" draggable={false} />
            </motion.div>
          )}
        </div>
      </div>

      {/* 클릭 영역 */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          cursor: myTurn ? 'pointer' : 'default',
          zIndex: 5,
        }}
        onClick={runNext}
      />

      {/* ✅ reward 칸처럼 안내 문구 */}
      <div className="itemtile-instruction-front">
        <InstructionText>스페이스바를 눌러 아이템 획득하기</InstructionText>
      </div>
    </motion.div>
  );
}
