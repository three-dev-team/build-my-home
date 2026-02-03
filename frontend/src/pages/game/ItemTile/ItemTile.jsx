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

// boolean/문자열 boolean('true') 모두 허용
const toBool = (v) => v === true || v === 'true';

// 아이템 키를 문자열로 정규화(따옴표 감싸진 경우 제거)
const normalizeKey = (v) => {
  if (v == null) return null;
  if (typeof v === 'string') return v.trim().replace(/^"+|"+$/g, '') || null;
  return null;
};

// gameState에서 currentPlayer 객체 찾기(players 배열/객체 모두 방어)
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

// uiStep 범위/타입 방어(0~10)
const clampStep = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(10, n));
};

// characterId로 캐릭터 메타 찾기
const getCharacter = (characterId) => {
  const id = Number(characterId);
  return CHARACTERS.find((c) => Number(c.id) === id) || null;
};

export default function ItemTile({ gameState, myId, isMyTurn = true, onAction, onExit }) {
  if (!gameState) return null;

  const myTurn = toBool(isMyTurn);

  // currentPlayer가 순간 null이 되는 프레임 대비(lastCp 유지)
  const cpRaw = useMemo(() => pickCurrentPlayer(gameState), [gameState]);
  const lastCpRef = useRef(null);
  useEffect(() => {
    if (cpRaw) lastCpRef.current = cpRaw;
  }, [cpRaw]);
  const cp = cpRaw || lastCpRef.current;

  // cp가 없으면 렌더하지 않음(깜빡임 방지)
  if (!cp) return null;

  // 서버 uiStep을 안전하게 숫자/범위로 변환
  const rawStep = useMemo(() => clampStep(cp?.uiStep ?? 0), [cp?.uiStep]);

  // 화면 표시용 플레이어 이름/캐릭터 이미지 준비
  const playerName = String(cp?.nickname ?? '').trim();
  const character = useMemo(() => getCharacter(cp?.characterId), [cp?.characterId]);

  const deliveryImage = character?.deliveryImage || character?.selectBasicImage || null;
  const happyImage = character?.happyImage || character?.deliveryImage || character?.selectBasicImage || null;

  // 인벤토리 키 배열 정규화(최대 3칸 UI에서 사용)
  const inventoryKeys = useMemo(() => {
    const raw = cp?.items || [];
    if (!Array.isArray(raw)) return [];
    return raw.map(normalizeKey).filter(Boolean);
  }, [cp]);

  // 인벤 3개 이상이면 "선택" 흐름(새 아이템 받을 때 교체)
  const inventoryFull = (inventoryKeys?.length || 0) >= 3;

  // 백엔드에서 내려오는 후보 아이템 키(actionDataStr)
  const candidateKey = useMemo(() => {
    const s = cp?.actionDataStr;
    return typeof s === 'string' ? s : null;
  }, [cp?.actionDataStr]);

  // 선택 인덱스(actionData) 방어
  const selectedIdx = useMemo(() => {
    const v = Number(cp?.actionData);
    return Number.isFinite(v) ? v : 0;
  }, [cp?.actionData]);

  // onAction 래핑(호출 안전화)
  const wrappedAction = useCallback((type, payload) => onAction?.(type, payload), [onAction]);

  // 나가기 처리(내 턴일 때만 동작하도록 훅에서 제어)
  const handleExit = useExitHandler(myTurn, onExit);

  // WAITING_ITEMS "사이클" 기준 키(방/플레이어/라운드 단위로 리셋)
  const cycleKey = useMemo(() => {
    return `${gameState?.roomId ?? 'x'}|${gameState?.currentPlayerId ?? 'x'}|${gameState?.currentRound ?? 'x'}|WAITING_ITEMS`;
  }, [gameState?.roomId, gameState?.currentPlayerId, gameState?.currentRound]);

  // step이 뒤로 내려가는 깜빡임 방지용(최대값만 유지)
  const stepRef = useRef(0);
  const sawSelectRef = useRef(false);

  // 새 사이클 진입 시 step 안정화 상태 초기화
  useEffect(() => {
    stepRef.current = 0;
    sawSelectRef.current = false;
  }, [cycleKey]);

  // 완전 첫 진입(0단계 + 후보 없음)일 때도 초기화
  const isFreshEnter = rawStep === 0 && cp?.actionDataStr == null;
  useEffect(() => {
    if (isFreshEnter) {
      stepRef.current = 0;
      sawSelectRef.current = false;
    }
  }, [isFreshEnter]);

  // step은 "최대값"으로만 진행(뒤로 튀는 프레임 무시)
  stepRef.current = Math.max(stepRef.current, rawStep);
  const step = stepRef.current;

  // 인벤이 가득 찬 상태에서 1단계를 봤는지 기록(분기 안정화용)
  if (inventoryFull && step === 1) sawSelectRef.current = true;

  // 완료 화면(step=3)일 때만 5초 타이머로 자동 종료
  useGameTimer(myTurn && step === 3 ? 5 : null, handleExit);

  // 하드코딩 색 제거용(CSS에서 var()로 사용)
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

              {step === 3 && (
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

  // 모달 UI는 body로 포탈 렌더(레이아웃/오버플로우 영향 최소화)
  return createPortal(ui, document.body);
}
