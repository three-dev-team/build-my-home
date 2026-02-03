import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { ITEM_INFO_BY_KEY } from '../../../constants/items.js';
import { COLORS } from '../../../constants/colors.js';
import InstructionText from '../../../components/common/InstructionText.jsx';

const fallbackItem = (key) => ({
  key,
  name: '알 수 없음',
  desc: '',
  image: '/images/item/item-custom_dice.webp',
});

const toBool = (v) => v === true || v === 'true';

export default function SelectScreen({ inventoryKeys, newItemKey, selectedIdx, onAction, isMyTurn }) {
  const myTurn = toBool(isMyTurn);
  const submittingRef = useRef(false);

  // 인벤 3개 + 새 아이템 1개(총 4개)
  const allItems = useMemo(() => {
    const inv = (inventoryKeys || []).map((k) => ITEM_INFO_BY_KEY[k] || fallbackItem(k));
    const newOne = { ...(ITEM_INFO_BY_KEY[newItemKey] || fallbackItem(newItemKey)), isNew: true };
    return [...inv, newOne];
  }, [inventoryKeys, newItemKey]);

  const [localSelected, setLocalSelected] = useState(() => {
    if (Number.isInteger(selectedIdx)) return selectedIdx;
    return allItems.length > 0 ? 0 : null;
  });

  // ✅ 잠금 해제 타이밍 보강
  useEffect(() => {
    submittingRef.current = false;

    if (Number.isInteger(selectedIdx)) {
      setLocalSelected(selectedIdx);
      return;
    }
    if (!Number.isInteger(localSelected) && allItems.length > 0) setLocalSelected(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIdx, allItems.length]);

  // ✅ 선택이 바뀌거나(다른 카드 클릭) 아이템 목록이 갱신되면 잠금 해제
  useEffect(() => {
    submittingRef.current = false;
  }, [localSelected, newItemKey]);

  // 카드 선택
  const handleSelect = useCallback(
    (idx) => {
      if (!myTurn) return;
      if (submittingRef.current) return;

      setLocalSelected(idx);
      onAction?.('SELECT_ITEM_TO_DROP', { actionData: idx, actionDataStr: String(idx) });
    },
    [onAction, myTurn],
  );

  // 선택 확정(클릭으로만)
  const handleConfirmClick = useCallback(() => {
    if (!myTurn) return;
    if (submittingRef.current) return;
    if (!Number.isInteger(localSelected)) return;

    // ✅ onAction이 없으면 잠그지 말기 (잠금만 걸리고 아무 일도 안 일어나는 케이스 방지)
    if (!onAction) return;

    submittingRef.current = true;

    onAction('HANDLE_INVENTORY_FULL', {
      actionData: localSelected,
      actionDataStr: String(localSelected),
    });

    // ✅ 안전장치: 서버 응답/화면전환이 안 오면 1.2초 뒤 잠금 해제
    window.setTimeout(() => {
      submittingRef.current = false;
    }, 1200);
  }, [localSelected, onAction, myTurn]);

  const canConfirm = Number.isInteger(localSelected) && myTurn && !submittingRef.current;

  return (
    <motion.div
      className="itemtile-layer itemtile-select-layer"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      style={{
        '--creamWhite': COLORS.ac.creamWhite,
        '--nookCyan': COLORS.ac.nookCyan,
        '--darkBrown': COLORS.ac.darkBrown,
        '--red': COLORS.ac.red,
      }}
    >
      <div className="itemtile-select-wrap" aria-label="아이템 선택">
        <div className="itemtile-select-cards">
          {allItems.map((it, idx) => {
            const selected = localSelected === idx;

            return (
              <button
                key={`${it.key}-${idx}`}
                type="button"
                className={`itemtile-card ${selected ? 'active' : ''}`}
                onClick={() => handleSelect(idx)}
                disabled={!myTurn || submittingRef.current}
              >
                {selected ? (
                  <div
                    className={`itemtile-pick-pill ${canConfirm ? '' : 'is-disabled'}`}
                    role="button"
                    aria-disabled={!canConfirm}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (canConfirm) handleConfirmClick();
                    }}
                  >
                    선택하기 ✓
                  </div>
                ) : null}

                <div className="itemtile-card-inner">
                  {it.isNew ? <div className="itemtile-new-pill">새로운 아이템</div> : null}

                  <div className="itemtile-card-body">
                    <div className="itemtile-card-img" aria-hidden>
                      <img src={it.image} alt="" draggable={false} />
                    </div>
                    <div className="itemtile-card-name">{it.name}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="itemtile-instruction-front" aria-hidden>
        <InstructionText>
          주머니가 가득해서 더이상 담을 수 없어{'\n'}
          아이템을 하나 버려야할 거 같아 무엇을 버릴까?
        </InstructionText>
      </div>
    </motion.div>
  );
}
