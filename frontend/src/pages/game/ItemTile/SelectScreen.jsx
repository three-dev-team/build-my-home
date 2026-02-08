import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import useSpaceKey from '../../../hooks/useSpaceKey.js';
import { normalizeItemKey, resolveItemKey } from '../../../constants/items.js';
import InstructionText from '../../../components/common/InstructionText.jsx';
import { COLORS } from '../../../constants/colors.js';

const toBool = (v) => v === true || v === 'true';

// 아이템 key -> 표시용 메타 정규화
const normalizeItem = (key, isNew = false) => {
  const k = normalizeItemKey(key) || '';
  const info = k ? resolveItemKey(k) : null;

  return {
    key: k,
    name: typeof info?.name === 'string' ? info.name : '',
    desc: typeof info?.desc === 'string' ? info.desc : '',
    image: typeof info?.image === 'string' ? info.image : '',
    isNew,
  };
};

export default function SelectScreen({ inventoryKeys, newItemKey, selectedIdx, onAction, isMyTurn }) {
  const myTurn = toBool(isMyTurn);

  // SelectScreen 전용: 확정(스페이스/클릭) 연타 방지 + 일정 시간 후 자동 해제
  const confirmLockRef = useRef(false);
  const unlockTimerRef = useRef(null);

  const clearUnlockTimer = useCallback(() => {
    if (unlockTimerRef.current) {
      window.clearTimeout(unlockTimerRef.current);
      unlockTimerRef.current = null;
    }
  }, []);

  const unlockConfirm = useCallback(() => {
    confirmLockRef.current = false;
    clearUnlockTimer();
  }, [clearUnlockTimer]);

  const lockConfirmWithAutoUnlock = useCallback((ms = 1200) => {
    confirmLockRef.current = true;
    clearUnlockTimer();
    unlockTimerRef.current = window.setTimeout(() => {
      confirmLockRef.current = false;
      unlockTimerRef.current = null;
    }, ms);
  }, [clearUnlockTimer]);

  useEffect(() => {
    return () => {
      clearUnlockTimer();
    };
  }, [clearUnlockTimer]);

  // 인벤 3개 + 새 아이템 1개(총 4개)로 카드 구성
  const allItems = useMemo(() => {
    const inv = (inventoryKeys || []).map((k) => normalizeItem(k, false));
    const newOne = normalizeItem(newItemKey, true);
    return [...inv, newOne];
  }, [inventoryKeys, newItemKey]);

  // 로컬 선택값(서버 selectedIdx 우선, 없으면 0)
  const [localSelected, setLocalSelected] = useState(() => {
    if (Number.isInteger(selectedIdx)) return selectedIdx;
    return allItems.length > 0 ? 0 : null;
  });

  // 서버 선택값/목록 변경 시 선택 동기화 + 진행 중 신호로 보고 잠금 해제
  useEffect(() => {
    unlockConfirm();

    if (Number.isInteger(selectedIdx)) {
      setLocalSelected(selectedIdx);
      return;
    }

    if (!Number.isInteger(localSelected) && allItems.length > 0) setLocalSelected(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIdx, allItems.length, unlockConfirm]);

  // 새 아이템이 바뀌면(사이클 변화) 잠금 해제
  useEffect(() => {
    unlockConfirm();
  }, [newItemKey, unlockConfirm]);

  // 아이템 카드 선택(내 턴만)
  const handleSelect = useCallback(
    (idx) => {
      if (!myTurn) return;
      if (!onAction) return;

      setLocalSelected(idx);
      onAction('SELECT_ITEM_TO_DROP', { actionData: idx, actionDataStr: String(idx) });
    },
    [onAction, myTurn]
  );

  // 선택 확정(서버 액션 전송) - 연타 방지 잠금 적용
  const handleConfirm = useCallback(() => {
    if (!myTurn) return;
    if (!Number.isInteger(localSelected)) return;
    if (!onAction) return;

    if (confirmLockRef.current) return;
    lockConfirmWithAutoUnlock(1200);

    onAction('HANDLE_INVENTORY_FULL', {
      actionData: localSelected,
      actionDataStr: String(localSelected),
    });
  }, [localSelected, onAction, myTurn, lockConfirmWithAutoUnlock]);

  // 스페이스로 확정(잠금/해제는 SelectScreen에서만 관리)
  useSpaceKey(handleConfirm, { enabled: myTurn });

  // 확정 가능 여부(내 턴 + 선택됨 + 잠금 아님)
  const canConfirm = Number.isInteger(localSelected) && myTurn && !confirmLockRef.current;

  return (
    <motion.div
      style={{
        '--creamWhite': COLORS.ac.creamWhite,
        '--nookCyan': COLORS.ac.nookCyan,
        '--darkBrown': COLORS.ac.darkBrown,
        '--red': COLORS.ac.red,
        '--white': COLORS.ac.white,
      }}
      className="itemtile-layer itemtile-select-layer"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="itemtile-select-wrap" aria-label="아이템 선택">
        <div className="itemtile-select-cards">
          {allItems.map((it, idx) => {
            const selected = localSelected === idx;

            return (
              <button
                key={`${it.key || 'x'}-${idx}`}
                type="button"
                className={`itemtile-card ${selected ? 'active' : ''}`}
                onClick={() => handleSelect(idx)}
                disabled={!myTurn}
              >
                {selected ? (
                  <div
                    className={`itemtile-pick-pill ${canConfirm ? '' : 'is-disabled'}`}
                    role="button"
                    aria-disabled={!canConfirm}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (canConfirm) handleConfirm();
                    }}
                  >
                    선택하기 ✓
                  </div>
                ) : null}

                <div className="itemtile-card-inner">
                  {it.isNew ? <div className="itemtile-new-pill">새로운 아이템</div> : null}

                  <div className="itemtile-card-body">
                    <div className="itemtile-card-img" aria-hidden>
                      {it.image ? <img src={it.image} alt="" draggable={false} /> : null}
                    </div>

                    <div className="itemtile-card-name">{it.name}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 인벤 가득 참 안내 */}
      <div className="itemtile-instruction-front" aria-hidden>
        <InstructionText>
          주머니가 가득해서 더이상 담을 수 없어{'\n'}
          아이템을 하나 버려야할 거 같아 무엇을 버릴까?
        </InstructionText>
      </div>
    </motion.div>
  );
}
