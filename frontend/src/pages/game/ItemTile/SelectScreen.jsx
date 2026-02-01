import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { ITEM_INFO_BY_KEY } from '../../../constants/items.js';
import useSpaceKey from '../../../components/common/useSpaceKey.js';

const fallbackItem = (key) => ({
  key,
  name: '알 수 없음',
  desc: '',
  image: '/images/item/item-custom_dice.webp',
});

const toBool = (v) => v === true || v === 'true';

const SelectScreen = ({ inventoryKeys, newItemKey, selectedIdx, onAction, isMyTurn }) => {
  const myTurn = toBool(isMyTurn);

  // ✅ confirm 중복 전송 방지(연타/스페이스 반복/클릭 중복)
  const submittingRef = useRef(false);

  const allItems = useMemo(() => {
    const inv = (inventoryKeys || []).map((k) => ITEM_INFO_BY_KEY[k] || fallbackItem(k));
    const newOne = { ...(ITEM_INFO_BY_KEY[newItemKey] || fallbackItem(newItemKey)), isNew: true };
    return [...inv, newOne];
  }, [inventoryKeys, newItemKey]);

  const getInitial = useCallback(() => {
    if (Number.isInteger(selectedIdx)) return selectedIdx;
    if (allItems.length > 0) return 0;
    return null;
  }, [selectedIdx, allItems.length]);

  const [localSelected, setLocalSelected] = useState(getInitial);

  useEffect(() => {
    // 화면 다시 열릴 때(혹은 서버에서 selectedIdx 내려올 때) submitting 잠금 해제
    submittingRef.current = false;

    if (Number.isInteger(selectedIdx)) {
      setLocalSelected(selectedIdx);
      return;
    }
    if (!Number.isInteger(localSelected) && allItems.length > 0) {
      setLocalSelected(0);
    }
  }, [selectedIdx, allItems.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = useCallback(
    (idx) => {
      if (!myTurn) return;
      if (submittingRef.current) return; // confirm 처리 중엔 선택 변경 막기(중복 액션 방지)

      setLocalSelected(idx);

      // ✅ 서버 호환성 위해 actionData + actionDataStr 둘 다 실어 보냄
      onAction('SELECT_ITEM_TO_DROP', { actionData: idx, actionDataStr: String(idx) });
    },
    [onAction, myTurn],
  );

  const handleConfirm = useCallback(() => {
    if (!myTurn) return;
    if (submittingRef.current) return;
    if (!Number.isInteger(localSelected)) return;

    submittingRef.current = true;

    // ✅ 서버 호환성 위해 actionData + actionDataStr 둘 다
    onAction('HANDLE_INVENTORY_FULL', {
      actionData: localSelected,
      actionDataStr: String(localSelected),
    });
  }, [localSelected, onAction, myTurn]);

  // ✅ 스페이스도 confirm인데, “키 반복”으로 중복 전송이 쉽게 나서
  // submittingRef로 한번 잠그고, canConfirm 조건에도 반영
  const canConfirm = Number.isInteger(localSelected) && myTurn && !submittingRef.current;

  useSpaceKey(handleConfirm, { enabled: canConfirm });

  return (
    <motion.div
      className="itemtile-layer itemtile-select-layer"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="itemtile-select-area">
        {/* ✅ 버튼 줄(선택된 카드 위에만 버튼 노출) */}
        <div className="itemtile-confirm-row" aria-hidden>
          {allItems.map((_, idx) => (
            <div key={idx} className="itemtile-confirm-cell">
              {localSelected === idx ? (
                <button
                  type="button"
                  className={`itemtile-floating-confirm ${canConfirm ? '' : 'is-disabled'}`}
                  aria-disabled={!canConfirm}
                  disabled={!canConfirm}
                  onClick={handleConfirm}
                >
                  선택하기 ✓
                </button>
              ) : null}
            </div>
          ))}
        </div>

        {/* ✅ 카드 줄 */}
        <div className="itemtile-select-wrap" aria-label="아이템 선택">
          {allItems.map((it, idx) => {
            const selected = localSelected === idx;
            return (
              <button
                key={`${it.key}-${idx}`}
                type="button"
                className={`itemtile-card ${selected ? 'is-selected' : ''}`}
                onClick={() => handleSelect(idx)}
                disabled={!myTurn || submittingRef.current}
              >
                {it.isNew && <div className="itemtile-new-pill">새로운 아이템</div>}

                <div className="itemtile-card-image" aria-hidden>
                  <div className="itemtile-itembox" aria-hidden>
                    <img src={it.image} alt="" draggable={false} />
                  </div>
                </div>

                <div className="itemtile-card-title">{it.name}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ✅ 하단 안내 */}
      <div className="itemtile-bottom-guide">
        <div>주머니가 가득해서 더이상 담을 수 없어</div>
        <div>아이템을 하나 버려야할 거 같아 무엇을 버릴까?</div>
      </div>
    </motion.div>
  );
};

export default SelectScreen;
