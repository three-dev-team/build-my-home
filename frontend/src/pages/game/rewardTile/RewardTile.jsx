import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import './RewardTile.css';

import RewardDiscoverScreen from './RewardDiscoverScreen.jsx';
import RewardGetScreen from './RewardGetScreen.jsx';

import AspectLayout from '../../../components/layout/AspectLayout.jsx';
import useSpaceKey from '../../../hooks/useSpaceKey.js';
import { CHARACTERS } from '../../../constants/characters.js';
import { getMyIdFromToken } from '../../../utils/auth.js';

const toBool = (v) => v === true || v === 'true';

// 문자열 JSON 안전 파싱(실패 시 null)
const safeParseJson = (s) => {
  if (!s || typeof s !== 'string') return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

// currentPlayerId 기준 현재 턴 플레이어 추출
const pickCurrentPlayer = (gameState) => {
  const cpId = gameState?.currentPlayerId;
  const players = Array.isArray(gameState?.players) ? gameState.players : [];
  return players.find((p) => Number(p?.memberId) === Number(cpId)) || null;
};

// 객체 값 중 1개라도 양수면 true
const hasAnyPositive = (obj) =>
  !!obj && typeof obj === 'object' && Object.keys(obj).some((k) => Number(obj?.[k] || 0) > 0);

// 관전자 표시용 이름/집레벨/이름색 + 보유 재료(resources) 확정 추출
const pickViewerInfo = (gameState, myId) => {
  const players = Array.isArray(gameState?.players) ? gameState.players : [];
  const me = players.find((p) => Number(p?.memberId) === Number(myId)) || null;
  const ssNick = (sessionStorage.getItem('nickname') || '').trim();
  const viewerNameText = (String(me?.nickname ?? '').trim() || ssNick || '').trim();
  const rawLevel = me?.houseLevel ?? null; // 백엔드: HouseLevel enum이 내려올 것
  const viewerHouseLevel = rawLevel; // 숫자/문자열/enum 다 올 수 있어서 그대로 전달(houseLevel util이 처리)
  const myCharId = me?.characterId ?? null;
  const ch = CHARACTERS.find((c) => Number(c.id) === Number(myCharId)) || null;
  const viewerNameColor = ch?.color;
  const viewerOwnedResources = me?.resources && typeof me.resources === 'object' ? me.resources : {};

  return { viewerNameText, viewerHouseLevel, viewerNameColor, viewerOwnedResources };
};

export default function RewardTile({ roomId, stompClient, gameState, isMyTurn }) {
  const myTurn = toBool(isMyTurn);
  const cp = useMemo(() => pickCurrentPlayer(gameState), [gameState]);

  // uiStep: 0=Discover, 1=Complete
  const uiStep = useMemo(() => {
    const v = Number(cp?.uiStep ?? 0);
    return Number.isFinite(v) ? v : 0;
  }, [cp]);

  // actionDataStr JSON 파싱 결과 캐시
  const rawActionStr = useMemo(() => (cp?.actionDataStr ? String(cp.actionDataStr) : ''), [cp?.actionDataStr]);
  const parsed = useMemo(() => safeParseJson(rawActionStr), [rawActionStr]);

  // 내 memberId 추출(세션 우선, 없으면 토큰)
  const myId = useMemo(() => {
    const ssMemberId = Number(sessionStorage.getItem('memberId'));
    if (Number.isFinite(ssMemberId) && ssMemberId > 0) return ssMemberId;

    const token = sessionStorage.getItem('token');
    const idFromToken = getMyIdFromToken(token);
    const nn = Number(idFromToken);
    return Number.isFinite(nn) && nn > 0 ? nn : null;
  }, []);

  const viewerInfo = useMemo(() => pickViewerInfo(gameState, myId), [gameState, myId]);

  const dialogNameRef = useRef('');
  const dialogColorRef = useRef(undefined);

  // 대사 이름/색 결정(관전: 내 이름, 내 턴: 나 제외 랜덤 1명)
  useEffect(() => {
    const players = Array.isArray(gameState?.players) ? gameState.players : [];
    const myNick = String(viewerInfo?.viewerNameText || '').trim();

    if (!myTurn) {
      dialogNameRef.current = myNick;
      dialogColorRef.current = viewerInfo?.viewerNameColor;
      return;
    }

    const pool = players
      .filter((p) => {
        const nick = String(p?.nickname ?? '').trim();
        if (!nick) return false;
        if (myNick && nick === myNick) return false;
        if (myId != null && Number(p?.memberId) === Number(myId)) return false;
        return true;
      })
      .map((p) => ({
        nickname: String(p.nickname).trim(),
        characterId: p?.characterId ?? null,
      }));

    if (!pool.length) {
      dialogNameRef.current = myNick;
      dialogColorRef.current = viewerInfo?.viewerNameColor;
      return;
    }

    const picked = pool[Math.floor(Math.random() * pool.length)];
    dialogNameRef.current = picked.nickname;

    const ch = CHARACTERS.find((c) => Number(c.id) === Number(picked.characterId)) || null;
    dialogColorRef.current = ch?.color;
  }, [myTurn, uiStep, gameState?.currentPlayerId, gameState?.players, myId, viewerInfo?.viewerNameText, viewerInfo?.viewerNameColor]);

  // 화면 표시용 파생 데이터 묶음
  const derived = useMemo(() => {
    const status = gameState?.status;
    const defaultKind = status === 'WAITING_HARVEST' ? 'fruit' : 'resource';
    const kind = parsed?.kind === 'fruit' || parsed?.kind === 'resource' ? parsed.kind : defaultKind;

    const ch = CHARACTERS.find((c) => Number(c.id) === Number(cp?.characterId)) || null;
    const idleCharacterImage = ch?.selectBasicImage || '';
    const happyCharacterImage = ch?.happyImage || idleCharacterImage;

    const cpNickname = String(cp?.nickname ?? '').trim();
    const nameColor = ch?.color;

    const gainedFromServer = parsed?.gained && typeof parsed.gained === 'object' ? parsed.gained : null;
    const hasRes = gameState?.gainedResources && Object.keys(gameState.gainedResources).length > 0;
    const hasHar = gameState?.gainedHarvests && Object.keys(gameState.gainedHarvests).length > 0;
    const gainedFallback =
      kind === 'fruit' ? (hasHar ? gameState.gainedHarvests : null) : hasRes ? gameState.gainedResources : null;

    const gained = hasAnyPositive(gainedFromServer) ? gainedFromServer : gainedFallback || {};

    let dropKeys = Array.isArray(parsed?.dropKeys) ? parsed.dropKeys.filter(Boolean) : [];
    if (!dropKeys.length && gained && typeof gained === 'object') {
      const keys = Object.keys(gained).filter((k) => Number(gained?.[k] || 0) > 0);
      dropKeys = keys.slice(0, 2);
    }

    return { kind, idleCharacterImage, happyCharacterImage, cpNickname, nameColor, dropKeys };
  }, [gameState, cp, parsed]);

  const { kind, idleCharacterImage, happyCharacterImage, cpNickname, nameColor, dropKeys } = derived;

  const [dropRunId, setDropRunId] = useState(0);
  const [fixedKeys, setFixedKeys] = useState([null, null]);
  const prevUiStepRef = useRef(uiStep);
  const doneCalledRef = useRef(false);
  const completeStartedAtRef = useRef(0);

  // 서버 액션 전송(/app/games/action)
  const sendAction = useCallback(
    (type) => {
      if (!stompClient || !roomId) return;
      stompClient.publish({
        destination: '/app/games/action',
        body: JSON.stringify({ roomId, type }),
      });
    },
    [stompClient, roomId]
  );

  // 서버 이벤트 종료(/app/games/event-complete)
  const sendEventComplete = useCallback(() => {
    if (!stompClient || !roomId) return;
    stompClient.publish({
      destination: '/app/games/event-complete',
      body: JSON.stringify({ roomId }),
    });
  }, [stompClient, roomId]);

  // uiStep 변경 시 드랍/고정 슬롯 상태 초기화
  useEffect(() => {
    const prev = prevUiStepRef.current;
    if (prev === uiStep) return;
    prevUiStepRef.current = uiStep;

    setFixedKeys([null, null]);
    setDropRunId((v) => v + 1);
    doneCalledRef.current = false;

    if (uiStep === 0) {
      completeStartedAtRef.current = 0;
      return;
    }

    if (uiStep === 1) {
      if (!completeStartedAtRef.current) completeStartedAtRef.current = Date.now();
    }
  }, [uiStep]);

  // 드랍 1개 완료 시 fixedKeys 반영
  const onDropOneDone = useCallback(({ index, key }) => {
    setFixedKeys((prev) => {
      const next = Array.isArray(prev) ? [...prev] : [null, null];
      if ((index === 0 || index === 1) && key) next[index] = key;
      return next;
    });
  }, []);

  // Discover(0)에서 스페이스바로 확인(내 턴만)
  const onSpaceAtDiscover = useCallback(() => {
    if (!myTurn) return;
    if (uiStep !== 0) return;
    sendAction('REWARD_CONFIRM');
  }, [myTurn, uiStep, sendAction]);

  useSpaceKey(onSpaceAtDiscover, { enabled: myTurn && uiStep === 0 });

  // Complete(1)에서 4초 뒤 자동 종료(내 턴만)
  useEffect(() => {
    if (uiStep !== 1) return;
    if (!myTurn) return;

    if (!completeStartedAtRef.current) completeStartedAtRef.current = Date.now();
    const startedAt = completeStartedAtRef.current;
    const remain = Math.max(0, 4000 - (Date.now() - startedAt));

    const t = window.setTimeout(() => {
      if (doneCalledRef.current) return;
      doneCalledRef.current = true;
      sendEventComplete();
    }, remain);

    return () => window.clearTimeout(t);
  }, [uiStep, myTurn, sendEventComplete]);

  // dropKeys 2개까지 정규화
  const dropKeysNormalized = useMemo(() => {
    const a = dropKeys?.[0] || null;
    const b = dropKeys?.[1] || null;
    const arr = [];
    if (a) arr.push(a);
    if (b) arr.push(b);
    return arr;
  }, [dropKeys]);

  // 화면 노출 플래그
  const showDrop = uiStep === 1;
  const showSubtitle = uiStep === 1;
  const characterImage = showSubtitle ? happyCharacterImage : idleCharacterImage;

  // 관전 대사 이름/색 정리(없으면 '' / undefined)
  const dialogViewerName = String(dialogNameRef.current || viewerInfo?.viewerNameText || '').trim();
  const dialogViewerColor = dialogColorRef.current ?? viewerInfo?.viewerNameColor;

  return (
    <div className="rewardtile-root" role="dialog" aria-modal="true">
      <AspectLayout>
        <div className="rewardtile-screen">
          <div className={`rewardtile-bg ${kind}`} aria-hidden="true" />

          <AnimatePresence mode="wait">
            {uiStep === 0 && (
              <motion.div
                key="reward-discover"
                className="rewardtile-layer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <RewardDiscoverScreen kind={kind} isMyTurn={myTurn} characterImage={idleCharacterImage} />
              </motion.div>
            )}

            {uiStep === 1 && (
              <motion.div
                key={`reward-complete-${dropRunId}`}
                className="rewardtile-layer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <RewardGetScreen
                  kind={kind}
                  nickname={cpNickname}
                  nameColor={nameColor}
                  characterImage={characterImage}
                  dropKeys={dropKeysNormalized}
                  topKeys={fixedKeys}
                  showDrop={showDrop}
                  showSubtitle={showSubtitle}
                  dropRunId={dropRunId}
                  onDropOneDone={onDropOneDone}
                  viewerNameText={dialogViewerName}
                  viewerHouseLevel={viewerInfo?.viewerHouseLevel}
                  viewerNameColor={dialogViewerColor}
                  viewerOwnedResources={viewerInfo?.viewerOwnedResources}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </AspectLayout>
    </div>
  );
}
