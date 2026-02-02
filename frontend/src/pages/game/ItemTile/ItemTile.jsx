import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence } from 'framer-motion';
import './ItemTile.css';

import DiscoverScreen from './DiscoverScreen.jsx';
import SelectScreen from './SelectScreen.jsx';
import CompleteScreen from './CompleteScreen.jsx';

import { useExitHandler } from '../../../hooks/useExitHandler.js';
import { useGameTimer } from '../../../hooks/useGameTimer.js';
import { CHARACTERS } from '../../../constants/characters.js';

const toBool = (v) => v === true || v === 'true';

const pickCurrentPlayer = (gameState) => {
  const cpId = gameState?.currentPlayerId;
  const players = gameState?.players;
  if (!cpId || !players) return null;

  if (Array.isArray(players)) {
    return players.find((p) => Number(p?.memberId) === Number(cpId)) || null;
  }
  if (players && typeof players === 'object') {
    return players[cpId] || players[String(cpId)] || null;
  }
  return null;
};

const clampStep = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(10, n));
};

const getCharacter = (characterId) => {
  const id = Number(characterId);
  return CHARACTERS.find((c) => Number(c.id) === id) || null;
};

const safeParseJson = (s) => {
  if (!s || typeof s !== 'string') return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
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

const extractItemKeyFromActionStr = (actionStr) => {
  const raw = normalizeKey(actionStr);
  if (!raw) return null;

  if (raw.startsWith('{') && raw.endsWith('}')) {
    const parsed = safeParseJson(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const cand = parsed.newItemKey ?? parsed.itemKey ?? parsed.key ?? parsed.serverKey ?? parsed.type ?? null;
    return normalizeKey(cand);
  }
  return raw;
};

export default function ItemTile({ gameState, myId, isMyTurn = true, onAction, onExit }) {
  if (!gameState) return null;

  const currentPlayer = useMemo(() => pickCurrentPlayer(gameState), [gameState]);
  const myTurn = toBool(isMyTurn);

  const serverStep = useMemo(
    () => clampStep(currentPlayer?.uiStep ?? gameState?.uiStep ?? 0),
    [currentPlayer?.uiStep, gameState?.uiStep],
  );

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

  const lastCandidateRef = useRef(null);
  const candidateKeyRaw = useMemo(() => {
    const k = extractItemKeyFromActionStr(currentPlayer?.actionDataStr);
    return k ?? null;
  }, [currentPlayer?.actionDataStr]);

  useEffect(() => {
    if (candidateKeyRaw) lastCandidateRef.current = candidateKeyRaw;
    if (candidateKeyRaw === null && currentPlayer?.actionDataStr === null) lastCandidateRef.current = null;
  }, [candidateKeyRaw, currentPlayer?.actionDataStr]);

  const candidateKey = candidateKeyRaw ?? lastCandidateRef.current;

  const selectedIdx = useMemo(() => {
    const v = Number(currentPlayer?.actionData);
    return Number.isFinite(v) ? v : 0;
  }, [currentPlayer?.actionData]);

  const wrappedAction = useCallback((type, payload) => onAction?.(type, payload), [onAction]);

  const handleExit = useExitHandler(myTurn, onExit);
  useGameTimer(myTurn && serverStep === 3 ? 5 : null, handleExit);

  const eventKey = useMemo(() => {
    return `${gameState?.currentPlayerId ?? 'x'}|${gameState?.currentRound ?? 'x'}|${gameState?.status ?? 'x'}|${serverStep}`;
  }, [gameState?.currentPlayerId, gameState?.currentRound, gameState?.status, serverStep]);

  const ui = (
    <div className="itemtile-root" data-itemtile="true">
      {/* ✅ 16:9 기준 프레임 + cqw/cqh 기준 강제 */}
      <div className="itemtile-frame" style={{ containerType: 'size' }}>
        <div className="itemtile-bg" style={{ backgroundImage: 'url("/images/item/bg-itemtile.webp")' }} />

        <div className="itemtile-safe">
          <div className="itemtile-screen">
            <AnimatePresence mode="wait" initial={false}>
              {serverStep === 0 && (
                <DiscoverScreen
                  key={`s0-${eventKey}`}
                  isMyTurn={myTurn}
                  onAction={wrappedAction}
                  characterDeliveryImage={deliveryImage}
                  characterHappyImage={happyImage}
                />
              )}

              {serverStep === 1 && (
                <SelectScreen
                  key={`s1-${eventKey}`}
                  inventoryKeys={inventoryKeys}
                  candidateKey={candidateKey}
                  isMyTurn={myTurn}
                  onAction={wrappedAction}
                  selectedIdx={selectedIdx}
                />
              )}

              {serverStep === 3 && (
                <CompleteScreen
                  key={`s3-${eventKey}`}
                  playerName={playerName}
                  newItemKey={candidateKey}
                  characterImage={happyImage}
                  isMyTurn={myTurn}
                  handleExit={handleExit}
                  nameBoxColor={nameBoxColor}
                />
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(ui, document.body);
}
