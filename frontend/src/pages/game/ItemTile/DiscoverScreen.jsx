import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import useSpaceKey from '../../../hooks/useSpaceKey.js';
import InstructionText from '../../../components/common/InstructionText.jsx';

const toBool = (v) => v === true || v === 'true';

// ItemTile Discover 단계(스페이스로 아이템 획득)
export default function DiscoverScreen({
                                         isMyTurn,
                                         onAction,
                                         characterDeliveryImage,
                                         characterHappyImage,
                                         hasCandidate = false,
                                       }) {
  const myTurn = toBool(isMyTurn);

  // ✅ 클라 1차 연타 방지(서버 검증은 별개로 꼭 필요)
  const firedRef = useRef(false);

  useEffect(() => {
    // 화면 재진입/리렌더 시 후보가 없어졌으면 잠금 해제
    if (!hasCandidate) firedRef.current = false;
  }, [hasCandidate]);

  const handleNext = useCallback(() => {
    if (!myTurn) return;
    if (!onAction) return;

    // 이미 후보가 있는 상태면 중복 요청 막기
    if (hasCandidate) return;

    // 아주 짧은 창에서 연타 방지
    if (firedRef.current) return;
    firedRef.current = true;

    onAction('GET_RANDOM_ITEM', {});

    // 서버 응답 지연 대비: 너무 오래 잠기지 않게 안전 해제
    window.setTimeout(() => {
      firedRef.current = false;
    }, 700);
  }, [myTurn, onAction, hasCandidate]);

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
