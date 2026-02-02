import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence } from 'framer-motion';
import './ItemTile.css';

import DiscoverScreen from './DiscoverScreen.jsx';
import SelectScreen from './SelectScreen.jsx';
import GetScreen from './GetScreen.jsx';
import CompleteScreen from './CompleteScreen.jsx';
import { useExitHandler } from '../../../hooks/useExitHandler.js';
import { useGameTimer } from '../../../hooks/useGameTimer.js';
import { CHARACTERS } from '../../../constants/characters.js';

const getCharacter = (characterId) => {
  const id = Number(characterId);
  return CHARACTERS.find((c) => Number(c.id) === id) || null;
};

const normalizeKey = (v) => {
  if (v == null) return null;
  if (typeof v === 'string') return v.trim().replace(/^"+|"+$/g, '') || null;
  if (typeof v === 'object') {
    if (typeof v.key === 'string') return normalizeKey(v.key);
    if (typeof v.serverKey === 'string') return normalizeKey(v.serverKey);
    if (typeof v.type === 'string') return normalizeKey(v.type);
  }
  return null;
};

const safeParseJson = (s) => {
  if (!s || typeof s !== 'string') return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

const extractItemKeyFromActionStr = (actionStr) => {
  const raw = normalizeKey(actionStr);
  if (!raw) return null;

  if (raw.startsWith('{') && raw.endsWith('}')) {
    const parsed = safeParseJson(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const cand =
      parsed.newItemKey ??
      parsed.itemKey ??
      parsed.key ??
      parsed.serverKey ??
      parsed.type ??
      null;
    return normalizeKey(cand);
  }

  return raw;
};

const pickCurrentPlayer = (gameState) => {
  const pid = gameState?.currentPlayerId;
  if (!pid) return null;

  const ps = gameState?.players;
  if (Array.isArray(ps)) {
    return ps.find((p) => Number(p?.memberId) === Number(pid)) || null;
  }
  if (ps && typeof ps === 'object') {
    return ps[pid] || ps[String(pid)] || null;
  }
  return null;
};

export default function ItemTile({ gameState, myId, isMyTurn = true, onAction, onExit }) {
  if (!gameState) return null;

  const currentPlayer = useMemo(() => pickCurrentPlayer(gameState), [gameState]);

  const step = useMemo(() => {
    const v = Number(currentPlayer?.uiStep ?? gameState?.uiStep ?? 0);
    return Number.isFinite(v) ? v : 0;
  }, [currentPlayer?.uiStep, gameState?.uiStep]);

  const playerName = currentPlayer?.nickname || '';
  const character = useMemo(() => getCharacter(currentPlayer?.characterId), [currentPlayer?.characterId]);

  const deliveryImage = character?.deliveryImage || character?.selectBasicImage || null;
  const happyImage = character?.happyImage || character?.deliveryImage || character?.selectBasicImage || null;
  const nameBoxColor = character?.color || '#594E36';

  const inventoryKeys = useMemo(() => {
    const raw = currentPlayer?.items || [];
    if (!Array.isArray(raw)) return [];
    return raw.map(normalizeKey).filter(Boolean);
  }, [currentPlayer]);

  const invLen = inventoryKeys.length;

  // ✅ sticky 인벤 길이 (렌더 시점 반영)
  const maxInvLenRef = useRef(0);
  if (invLen > maxInvLenRef.current) maxInvLenRef.current = invLen;

  // ✅ newItemKey sticky
  const lastNewItemKeyRef = useRef(null);

  const newItemKeyRaw = useMemo(() => {
    const k0 = extractItemKeyFromActionStr(currentPlayer?.actionDataStr);
    if (k0) return k0;

    const k1 = extractItemKeyFromActionStr(gameState?.actionDataStr);
    if (k1) return k1;

    const k2 = normalizeKey(currentPlayer?.actionData);
    if (k2) return k2;

    const k3 = normalizeKey(gameState?.actionData);
    if (k3) return k3;

    return null;
  }, [currentPlayer?.actionDataStr, gameState?.actionDataStr, currentPlayer?.actionData, gameState?.actionData]);

  useEffect(() => {
    if (newItemKeyRaw) lastNewItemKeyRef.current = newItemKeyRaw;
  }, [newItemKeyRaw]);

  const stableNewItemKey = newItemKeyRaw || lastNewItemKeyRef.current;

  // ✅ confirm(= step2/3로 넘어가도 되는 타이밍) 보냈는지
  const confirmSentRef = useRef(false);

  // ✅ "첫 화면(Discover)을 최소 1번은 보여주기" 플래그
  const discoverShownRef = useRef(false);

  // ✅ 이벤트 단위 키
  const eventKey = useMemo(() => {
    return `${gameState?.currentPlayerId ?? 'x'}|${gameState?.currentRound ?? 'x'}|${gameState?.status ?? 'x'}`;
  }, [gameState?.currentPlayerId, gameState?.currentRound, gameState?.status]);

  useEffect(() => {
    confirmSentRef.current = false;
    discoverShownRef.current = false;
    // maxInvLenRef는 리셋하지 않음(깜빡임 원인)
  }, [eventKey]);

  // ✅ invFull 판단은 현재 invLen까지 포함
  const invFull = Math.max(maxInvLenRef.current, invLen) >= 3;

  /**
   * ✅ 최종 가드 로직
   * 1) confirm 전에 step2/3이 오면 무조건 무시(= 마지막 장면 스침 원천 차단)
   * 2) invFull이면 Discover는 1회만 허용하고 그 이후는 Select로 고정
   */
  const effectiveStep = useMemo(() => {
    // (1) confirm 전에는 절대 step2/3을 보여주지 않음
    if (!confirmSentRef.current && (step === 2 || step === 3)) {
      // 인벤 꽉참이면 Select(1)로, 아니면 Discover(0)로 돌려버림
      return invFull ? 1 : 0;
    }

    // (2) 인벤 꽉참이면 confirm 전까지 Discover 1회만 허용 후 Select 고정
    if (invFull && !confirmSentRef.current) {
      if (!discoverShownRef.current && step === 0) return 0;
      return 1;
    }

    return step;
  }, [invFull, step]);

  // ✅ Discover가 실제로 렌더되면 “보여줬다” 기록
  useEffect(() => {
    if (effectiveStep === 0) discoverShownRef.current = true;
  }, [effectiveStep]);

  const wrappedAction = useCallback(
    (type, payload) => {
      if (type === 'ITEM_DROP_CONFIRM' || type === 'HANDLE_INVENTORY_FULL') {
        confirmSentRef.current = true;
      }
      onAction?.(type, payload);
    },
    [onAction],
  );

  const handleExit = useExitHandler(isMyTurn, onExit);
  useGameTimer(isMyTurn && (effectiveStep === 2 || effectiveStep === 3) ? 7 : null, handleExit);

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('[ItemTile]', {
      confirmSent: confirmSentRef.current,
      discoverShown: discoverShownRef.current,
      cpUiStep: currentPlayer?.uiStep,
      effectiveStep,
      invLen,
      invMaxLen: maxInvLenRef.current,
      newItemKeyRaw,
      stableNewItemKey,
      step,
    });
  }, [currentPlayer?.uiStep, effectiveStep, invLen, newItemKeyRaw, stableNewItemKey, step]);

  const ui = (
    <div className="itemtile-root" data-itemtile="true">
      <div className="itemtile-bg" style={{ backgroundImage: 'url("/images/item/bg-itemtile.webp")' }} />

      <div className="itemtile-safe">
        <div className="itemtile-screen">
          <AnimatePresence mode="sync">
            {effectiveStep === 0 && (
              <DiscoverScreen
                key="step0"
                isMyTurn={isMyTurn}
                onAction={wrappedAction}
                characterDeliveryImage={deliveryImage}
                characterHappyImage={happyImage}
              />
            )}

            {effectiveStep === 1 && (
              <SelectScreen
                key="step1"
                inventoryKeys={inventoryKeys}
                newItemKey={stableNewItemKey}
                selectedIdx={currentPlayer?.actionData ?? null}
                onAction={wrappedAction}
                isMyTurn={isMyTurn}
              />
            )}

            {effectiveStep === 2 && (
              <GetScreen
                key="step2"
                playerName={playerName}
                newItemKey={stableNewItemKey}
                characterImage={happyImage}
                nameBoxColor={nameBoxColor}
              />
            )}

            {effectiveStep === 3 && (
              <CompleteScreen
                key="step3"
                playerName={playerName}
                characterImage={happyImage}
                isMyTurn={isMyTurn}
                handleExit={handleExit}
                nameBoxColor={nameBoxColor}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );

  return createPortal(ui, document.body);
}
