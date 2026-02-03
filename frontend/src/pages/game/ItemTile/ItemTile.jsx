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
import { COLORS } from '../../../constants/colors.js';

const toBool = (v) => v === true || v === 'true';

const normalizeKey = (v) => {
  if (v == null) return null;
  if (typeof v === 'string') return v.trim().replace(/^"+|"+$/g, '') || null;
  return null;
};

const pickCurrentPlayer = (gameState) => {
  const cpId = gameState?.currentPlayerId;
  const players = gameState?.players;

  if (!cpId || !players) return null;

  // 1) 배열
  if (Array.isArray(players)) {
    return (
      players.find((p) => Number(p?.memberId) === Number(cpId)) ||
      players.find((p) => Number(p?.id) === Number(cpId)) ||
      players.find((p) => Number(p?.playerId) === Number(cpId)) ||
      null
    );
  }

  // 2) object 형태 방어
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

export default function ItemTile({ gameState, myId, isMyTurn = true, onAction, onExit }) {
  if (!gameState) return null;

  const myTurn = toBool(isMyTurn);

  // currentPlayer가 순간 null이 되는 프레임에서 uiStep이 튀지 않게 "lastCp" 유지
  const cpRaw = useMemo(() => pickCurrentPlayer(gameState), [gameState]);
  const lastCpRef = useRef(null);
  useEffect(() => {
    if (cpRaw) lastCpRef.current = cpRaw;
  }, [cpRaw]);
  const cp = cpRaw || lastCpRef.current;

  // cp가 null이면 렌더 자체를 하지 않음(깜빡임 방지)
  if (!cp) return null;

  const rawStep = useMemo(() => clampStep(cp?.uiStep ?? 0), [cp?.uiStep]);

  const playerName = String(cp?.nickname ?? '').trim();
  const character = useMemo(() => getCharacter(cp?.characterId), [cp?.characterId]);

  const deliveryImage = character?.deliveryImage || character?.selectBasicImage || null;
  const happyImage = character?.happyImage || character?.deliveryImage || character?.selectBasicImage || null;

  const inventoryKeys = useMemo(() => {
    const raw = cp?.items || [];
    if (!Array.isArray(raw)) return [];
    return raw.map(normalizeKey).filter(Boolean);
  }, [cp]);

  const inventoryFull = (inventoryKeys?.length || 0) >= 3;

  // 백엔드: GET_RANDOM_ITEM에서 player.actionDataStr=item.name()
  const candidateKey = useMemo(() => {
    const s = cp?.actionDataStr;
    return typeof s === 'string' ? s : null;
  }, [cp?.actionDataStr]);

  const selectedIdx = useMemo(() => {
    const v = Number(cp?.actionData);
    return Number.isFinite(v) ? v : 0;
  }, [cp?.actionData]);

  const wrappedAction = useCallback((type, payload) => onAction?.(type, payload), [onAction]);

  const handleExit = useExitHandler(myTurn, onExit);
  useGameTimer(myTurn && rawStep === 3 ? 5 : null, handleExit);

  // WAITING_ITEMS 사이클 키 (player/round 기준)
  const cycleKey = useMemo(() => {
    return `${gameState?.roomId ?? 'x'}|${gameState?.currentPlayerId ?? 'x'}|${gameState?.currentRound ?? 'x'}|WAITING_ITEMS`;
  }, [gameState?.roomId, gameState?.currentPlayerId, gameState?.currentRound]);

  // step이 뒤로 튀는 것 방지
  const stepRef = useRef(0);
  const sawSelectRef = useRef(false);

  useEffect(() => {
    stepRef.current = 0;
    sawSelectRef.current = false;
  }, [cycleKey]);

  const isFreshEnter = rawStep === 0 && cp?.actionDataStr == null;
  useEffect(() => {
    if (isFreshEnter) {
      stepRef.current = 0;
      sawSelectRef.current = false;
    }
  }, [isFreshEnter]);

  stepRef.current = Math.max(stepRef.current, rawStep);
  const step = stepRef.current;

  if (inventoryFull && step === 1) sawSelectRef.current = true;

  const canShowComplete = !inventoryFull || sawSelectRef.current;

  // 하드코딩 색 제거용 CSS 변수들
  const cssVars = {
    '--creamWhite': COLORS.ac.creamWhite,
    '--nookCyan': COLORS.ac.nookCyan,
    '--darkBrown': COLORS.ac.darkBrown,
    '--red': COLORS.ac.red,
    '--white': COLORS.ac.white,
  };

  const ui = (
    <div className="itemtile-root" data-itemtile="true">
      <div className="itemtile-frame" style={{ containerType: 'size' }}>
        <div className="itemtile-bg" style={{ backgroundImage: 'url("/images/item/bg-itemtile.webp")' }} />

        <div className="itemtile-safe" style={cssVars}>
          <div className="itemtile-screen">
            <AnimatePresence mode="wait" initial={false}>
              {step === 0 && (
                <DiscoverScreen
                  key={`s0-${cycleKey}`}
                  isMyTurn={myTurn}
                  onAction={wrappedAction}
                  characterDeliveryImage={deliveryImage}
                  characterHappyImage={happyImage}
                />
              )}

              {step === 1 && inventoryFull && (
                <SelectScreen
                  key={`s1-${cycleKey}`}
                  inventoryKeys={inventoryKeys}
                  newItemKey={candidateKey}
                  isMyTurn={myTurn}
                  onAction={wrappedAction}
                  selectedIdx={selectedIdx}
                />
              )}

              {step === 3 && canShowComplete && (
                <CompleteScreen
                  key={`s3-${cycleKey}`}
                  playerName={playerName || '곰돌'}
                  newItemKey={candidateKey}
                  characterImage={happyImage}
                  characterId={cp?.characterId}
                  isMyTurn={myTurn}
                  handleExit={handleExit}
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
