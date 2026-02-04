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
import { normalizeItemKey } from '../../../constants/items.js';

// boolean / 'true' 문자열을 boolean으로 정규화
const toBool = (v) => v === true || v === 'true';

// gameState에서 currentPlayer 추출(players 배열/객체 방어)
const pickCurrentPlayer = (gameState) => {
  const cpId = gameState?.currentPlayerId;
  const players = gameState?.players;

  if (!cpId || !players) return null;

  if (Array.isArray(players)) {
    return (
      players.find((p) => Number(p?.memberId) === Number(cpId)) ||
      players.find((p) => Number(p?.id) === Number(cpId)) ||
      players.find((p) => Number(p?.playerId) === Number(cpId)) ||
      null
    );
  }

  if (players && typeof players === 'object') {
    return players[cpId] || players[String(cpId)] || null;
  }

  return null;
};

// uiStep 값 방어(0~10)
const clampStep = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(10, n));
};

// characterId -> 캐릭터 메타 조회
const getCharacter = (characterId) => {
  const id = Number(characterId);
  return CHARACTERS.find((c) => Number(c.id) === id) || null;
};

export default function ItemTile({ gameState, myId, isMyTurn = true, onAction, onExit }) {
  if (!gameState) return null;

  const myTurn = toBool(isMyTurn);

  // ItemTile 배경 이미지 경로(이 파일 내부에서만 사용)
  const ITEM_TILE_BG_URL = '/images/item/bg-itemtile.webp';

  // currentPlayer null 프레임 대비(lastCp 유지)
  const cpRaw = useMemo(() => pickCurrentPlayer(gameState), [gameState]);
  const lastCpRef = useRef(null);

  useEffect(() => {
    if (cpRaw) lastCpRef.current = cpRaw;
  }, [cpRaw]);

  const cp = cpRaw || lastCpRef.current;
  if (!cp) return null;

  // 서버 uiStep을 안전한 step 값으로 변환
  const rawStep = useMemo(() => clampStep(cp?.uiStep ?? 0), [cp?.uiStep]);

  // 표시용 플레이어 이름/캐릭터 이미지 구성
  const playerName = String(cp?.nickname ?? '').trim();

  const character = useMemo(() => getCharacter(cp?.characterId), [cp?.characterId]);

  const deliveryImage = character?.deliveryImage || character?.selectBasicImage || null;
  const happyImage = character?.happyImage || character?.deliveryImage || character?.selectBasicImage || null;

  // 인벤토리 키 배열 정규화
  const inventoryKeys = useMemo(() => {
    const raw = cp?.items || [];
    if (!Array.isArray(raw)) return [];
    return raw.map(normalizeItemKey).filter(Boolean);
  }, [cp]);

  // 인벤 3개 이상이면 교체 선택 화면 노출
  const inventoryFull = (inventoryKeys?.length || 0) >= 3;

  // 후보 아이템 키 정규화(actionDataStr)
  const candidateKey = useMemo(() => {
    const s = cp?.actionDataStr;
    return normalizeItemKey(s);
  }, [cp?.actionDataStr]);

  // 선택 인덱스(actionData) 정규화
  const selectedIdx = useMemo(() => {
    const v = Number(cp?.actionData);
    return Number.isFinite(v) ? v : null;
  }, [cp?.actionData]);

  // onAction 호출 안전 래핑
  const wrappedAction = useCallback((type, payload) => onAction?.(type, payload), [onAction]);

  // 나가기 핸들러(내 턴일 때만 처리)
  const handleExit = useExitHandler(myTurn, onExit);

  // 이벤트 사이클 키(방/현재플레이어/라운드 단위로 리셋)
  const cycleKey = useMemo(() => {
    return `${gameState?.roomId ?? 'x'}|${gameState?.currentPlayerId ?? 'x'}|${gameState?.currentRound ?? 'x'}|WAITING_ITEMS`;
  }, [gameState?.roomId, gameState?.currentPlayerId, gameState?.currentRound]);

  // step이 뒤로 내려가는 프레임 방지(최대 step만 유지)
  const stepRef = useRef(0);

  useEffect(() => {
    stepRef.current = 0;
  }, [cycleKey]);

  const isFreshEnter = rawStep === 0 && cp?.actionDataStr == null;

  useEffect(() => {
    if (isFreshEnter) stepRef.current = 0;
  }, [isFreshEnter]);

  stepRef.current = Math.max(stepRef.current, rawStep);
  const step = stepRef.current;

  // 완료(step=3)에서만 자동 종료 타이머 동작
  useGameTimer(myTurn && step === 3 ? 5 : null, handleExit);

  // 색상은 CSS 변수로만 전달
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
        <div className="itemtile-bg" style={{ backgroundImage: `url("${ITEM_TILE_BG_URL}")` }} />

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

              {step === 3 && (
                <CompleteScreen
                  key={`s3-${cycleKey}`}
                  playerName={playerName}
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
