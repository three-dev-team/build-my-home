import React, { useCallback, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import useSpaceKey from '../../../hooks/useSpaceKey.js';
import InstructionText from '../../../components/common/InstructionText.jsx';

const toBool = (v) => v === true || v === 'true';

// Discover 단계: 내 턴만 스페이스로 아이템 뽑기 요청(후보가 이미 있으면 중복 요청 금지)
export default function DiscoverScreen({
                                         isMyTurn,
                                         onAction,
                                         characterDeliveryImage,
                                         characterHappyImage,
                                         hasCandidate = false,
                                       }) {
  const myTurn = toBool(isMyTurn);

  const handleNext = useCallback(() => {
    if (!myTurn) return;
    if (!onAction) return;
    if (hasCandidate) return; // 후보가 이미 있으면 연타/중복 요청 차단

    onAction('GET_RANDOM_ITEM', {});
  }, [myTurn, onAction, hasCandidate]);

  useSpaceKey(handleNext, { enabled: myTurn });

  // 표시 캐릭터: 배송 우선, 없으면 해피
  const img = useMemo(
    () => characterDeliveryImage || characterHappyImage || null,
    [characterDeliveryImage, characterHappyImage]
  );

  // 내 턴/관전 안내 문구
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
      <div className="itemtile-instruction-front" aria-hidden>
        <InstructionText>{instructionText}</InstructionText>
      </div>

      <div className="itemtile-character-box itemtile-char-discover" aria-hidden>
        <div className="itemtile-character-inner">
          {img ? <img src={img} alt="" draggable={false} /> : null}
        </div>
      </div>
    </motion.div>
  );
}
