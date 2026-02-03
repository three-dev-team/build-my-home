import React, { useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import useSpaceKey from '../../../components/common/useSpaceKey.js';
import InstructionText from '../../../components/common/InstructionText.jsx';

const toBool = (v) => v === true || v === 'true';

export default function DiscoverScreen({ isMyTurn, onAction, characterDeliveryImage, characterHappyImage }) {
  const myTurn = toBool(isMyTurn);

  // Discover에서 스페이스로 아이템 획득
  const handleNext = useCallback(() => {
    if (!myTurn) return;
    onAction?.('GET_RANDOM_ITEM', {});
  }, [myTurn, onAction]);

  useSpaceKey(handleNext, { enabled: myTurn });

  const img = useMemo(() => characterDeliveryImage || characterHappyImage || null, [
    characterDeliveryImage,
    characterHappyImage,
  ]);

  return (
    <motion.div
      className="itemtile-layer"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Discover에서만 안내 문구 노출 */}
      <div className="itemtile-instruction-front">
        <InstructionText>스페이스바를 눌러 아이템 획득하기</InstructionText>
      </div>

      {/* Discover 캐릭터 박스(368x600 / bottom 264) */}
      <div className="itemtile-character-box itemtile-char-discover" aria-hidden>
        <div className="itemtile-character-inner">{img ? <img src={img} alt="" draggable={false} /> : null}</div>
      </div>
    </motion.div>
  );
}
