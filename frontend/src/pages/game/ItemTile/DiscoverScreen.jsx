import React, { useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import useSpaceKey from '../../../hooks/useSpaceKey.js';
import InstructionText from '../../../components/common/InstructionText.jsx';

const toBool = (v) => v === true || v === 'true';

// ItemTile Discover 단계(스페이스로 아이템 획득)
export default function DiscoverScreen({ isMyTurn, onAction, characterDeliveryImage, characterHappyImage }) {
  const myTurn = toBool(isMyTurn);

  // 스페이스 입력 시 GET_RANDOM_ITEM 전송(내 턴만)
  const handleNext = useCallback(() => {
    if (!myTurn) return;
    onAction?.('GET_RANDOM_ITEM', {});
  }, [myTurn, onAction]);

  useSpaceKey(handleNext, { enabled: myTurn });

  // 표시할 캐릭터 이미지(배송 우선, 없으면 해피)
  const img = useMemo(() => characterDeliveryImage || characterHappyImage || null, [
    characterDeliveryImage,
    characterHappyImage,
  ]);

  // 안내 문구(내 턴/관전 분기)
  const instructionText = myTurn
    ? '스페이스바를 눌러 아이템 획득하기'
    : '상대가 획득 중이야... 잠시만 기다려줘!';

  return (
    <motion.div
      className="itemtile-layer"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 하단 안내 */}
      <div className="itemtile-instruction-front" aria-hidden>
        <InstructionText>{instructionText}</InstructionText>
      </div>

      {/* Discover 캐릭터(368x600 / bottom 264) */}
      <div className="itemtile-character-box itemtile-char-discover" aria-hidden>
        <div className="itemtile-character-inner">{img ? <img src={img} alt="" draggable={false} /> : null}</div>
      </div>
    </motion.div>
  );
}
