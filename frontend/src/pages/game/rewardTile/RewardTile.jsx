import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import './RewardTile.css';

import RewardDiscoverScreen from './RewardDiscoverScreen.jsx';
import RewardGetScreen from './RewardGetScreen.jsx';

import AspectLayout from '../../../components/layout/AspectLayout.jsx';
import useSpaceKey from '../../../components/common/useSpaceKey.js';
import { CHARACTERS } from '../../../constants/characters.js';
import { getMyIdFromToken } from '../../../utils/auth.js';

const toBool = (v) => v === true || v === 'true';

const safeParseJson = (s) => {
  if (!s || typeof s !== 'string') return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

const pickCurrentPlayer = (gameState) => {
  const cpId = gameState?.currentPlayerId;
  const players = gameState?.players || [];
  return players.find((p) => Number(p.memberId) === Number(cpId)) || null;
};

const hasAnyPositive = (obj) =>
  !!obj && typeof obj === 'object' && Object.keys(obj).some((k) => Number(obj?.[k] || 0) > 0);

const pickViewerInfo = (gameState, myId) => {
  const players = Array.isArray(gameState?.players) ? gameState.players : [];

  const me =
    players.find((p) => Number(p?.memberId) === Number(myId)) ||
    players.find((p) => Number(p?.id) === Number(myId)) ||
    players.find((p) => Number(p?.playerId) === Number(myId)) ||
    null;

  const ssNick =
    (sessionStorage.getItem('nickname') || '').trim() ||
    (sessionStorage.getItem('nickName') || '').trim() ||
    (sessionStorage.getItem('userNickname') || '').trim() ||
    '';

  const viewerNameText = (me?.nickname && String(me.nickname).trim()) || ssNick || '';

  const rawLevel =
    me?.houseLevel ??
    me?.houseLevelNumber ??
    me?.houseLevelValue ??
    me?.houseLv ??
    me?.house ??
    null;

  const n = Number(rawLevel);
  const viewerHouseLevel = Number.isFinite(n) ? n : null;

  const myCharId = me?.characterId ?? me?.charId ?? null;
  const ch = CHARACTERS.find((c) => Number(c.id) === Number(myCharId)) || null;
  const viewerNameColor = ch?.color || '#FFFFFF';

  return { viewerNameText, viewerHouseLevel, viewerNameColor };
};

export default function RewardTile({ roomId, stompClient, gameState, isMyTurn }) {
  const myTurn = toBool(isMyTurn);

  const cp = useMemo(() => pickCurrentPlayer(gameState), [gameState]);

  // ✅ uiStep: 0=Discover, 1=Complete (서버도 0/1로 맞춤)
  const uiStep = useMemo(() => {
    const v = Number(cp?.uiStep ?? 0);
    return Number.isFinite(v) ? v : 0;
  }, [cp]);

  const rawActionStr = useMemo(
    () => (cp?.actionDataStr ? String(cp.actionDataStr) : ''),
    [cp?.actionDataStr]
  );
  const parsed = useMemo(() => safeParseJson(rawActionStr), [rawActionStr]);

  // 내 id: 세션 우선, 없으면 토큰
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
  const dialogColorRef = useRef('#FFFFFF');

  // 대사 이름/색: 관전이면 내 이름, 내 턴이면 나 제외 랜덤 1명
  useEffect(() => {
    const players = Array.isArray(gameState?.players) ? gameState.players : [];
    const myNick = String(viewerInfo?.viewerNameText || '').trim();

    if (!myTurn) {
      dialogNameRef.current = myNick || '나';
      dialogColorRef.current = viewerInfo?.viewerNameColor || '#FFFFFF';
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
        characterId: p?.characterId ?? p?.charId ?? null,
      }));

    if (!pool.length) {
      dialogNameRef.current = myNick || '나';
      dialogColorRef.current = viewerInfo?.viewerNameColor || '#FFFFFF';
      return;
    }

    const picked = pool[Math.floor(Math.random() * pool.length)];
    dialogNameRef.current = picked.nickname;

    const ch = CHARACTERS.find((c) => Number(c.id) === Number(picked.characterId)) || null;
    dialogColorRef.current = ch?.color || '#FFFFFF';
  }, [
    myTurn,
    uiStep,
    gameState?.currentPlayerId,
    gameState?.players,
    myId,
    viewerInfo?.viewerNameText,
    viewerInfo?.viewerNameColor,
  ]);

  const derived = useMemo(() => {
    const status = gameState?.status;
    const defaultKind = status === 'WAITING_HARVEST' ? 'fruit' : 'resource';
    const kind = parsed?.kind === 'fruit' || parsed?.kind === 'resource' ? parsed.kind : defaultKind;

    const ch = CHARACTERS.find((c) => Number(c.id) === Number(cp?.characterId)) || null;
    const idleCharacterImage = ch?.selectBasicImage || ch?.iconIdle || ch?.roomListImage || '';
    const happyCharacterImage = ch?.happyImage || idleCharacterImage;

    const cpNickname = String(cp?.nickname ?? '').trim() || '곰돌';
    const nameColor = ch?.color || '#EB5757';

    const gainedFromServer = parsed?.gained && typeof parsed.gained === 'object' ? parsed.gained : null;

    const hasRes = gameState?.gainedResources && Object.keys(gameState.gainedResources).length > 0;
    const hasHar = gameState?.gainedHarvests && Object.keys(gameState.gainedHarvests).length > 0;

    const gainedFallback =
      kind === 'fruit'
        ? (hasHar ? gameState.gainedHarvests : null)
        : (hasRes ? gameState.gainedResources : null);

    const gained = hasAnyPositive(gainedFromServer) ? gainedFromServer : (gainedFallback || {});

    let dropKeys = Array.isArray(parsed?.dropKeys) ? parsed.dropKeys.filter(Boolean) : [];
    if (!dropKeys.length && gained && typeof gained === 'object') {
      const keys = Object.keys(gained).filter((k) => Number(gained?.[k] || 0) > 0);
      dropKeys = keys.slice(0, 2);
    }

    return {
      kind,
      idleCharacterImage,
      happyCharacterImage,
      cpNickname,
      nameColor,
      dropKeys,
    };
  }, [gameState, cp, parsed]);

  const { kind, idleCharacterImage, happyCharacterImage, cpNickname, nameColor, dropKeys } = derived;

  const [dropRunId, setDropRunId] = useState(0);
  const [fixedKeys, setFixedKeys] = useState([null, null]);

  const prevUiStepRef = useRef(uiStep);
  const doneCalledRef = useRef(false);
  const completeStartedAtRef = useRef(0);

  // 서버에 “확인(Discover->Complete)” 액션 전송
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

  // Complete 화면에서 일정 시간 뒤 이벤트 종료(다음 상태로 진행)
  const sendEventComplete = useCallback(() => {
    if (!stompClient || !roomId) return;
    stompClient.publish({
      destination: '/app/games/event-complete',
      body: JSON.stringify({ roomId }),
    });
  }, [stompClient, roomId]);

  // uiStep이 바뀔 때 드랍/고정슬롯 상태 초기화
  useEffect(() => {
    const prev = prevUiStepRef.current;
    if (prev === uiStep) return;
    prevUiStepRef.current = uiStep;

    if (uiStep === 0) {
      setFixedKeys([null, null]);
      setDropRunId((v) => v + 1);
      doneCalledRef.current = false;
      completeStartedAtRef.current = 0;
      return;
    }

    // ✅ complete는 1
    if (uiStep === 1) {
      setFixedKeys([null, null]);
      setDropRunId((v) => v + 1);
      doneCalledRef.current = false;
      if (!completeStartedAtRef.current) completeStartedAtRef.current = Date.now();
    }
  }, [uiStep]);

  // 드랍 1개 완료 시 fixedKeys에 반영(최종 고정 아이콘)
  const onDropOneDone = useCallback(({ index, key }) => {
    setFixedKeys((prev) => {
      const next = Array.isArray(prev) ? [...prev] : [null, null];
      if ((index === 0 || index === 1) && key) next[index] = key;
      return next;
    });
  }, []);

  // 스페이스바: Discover에서 확인 액션(내 턴만)
  const onSpaceAtDiscover = useCallback(() => {
    if (!myTurn) return;
    if (uiStep !== 0) return;
    sendAction('REWARD_CONFIRM');
  }, [myTurn, uiStep, sendAction]);

  useSpaceKey(onSpaceAtDiscover, { enabled: myTurn && uiStep === 0 });

  // ✅ Complete(1) 화면 4초 뒤 자동 종료(내 턴만 서버에 event-complete)
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

  const dropKeysNormalized = useMemo(() => {
    const a = dropKeys?.[0] || null;
    const b = dropKeys?.[1] || null;
    const arr = [];
    if (a) arr.push(a);
    if (b) arr.push(b);
    return arr;
  }, [dropKeys]);

  // ✅ complete는 1
  const showDrop = uiStep === 1;
  const showSubtitle = uiStep === 1;
  const characterImage = showSubtitle ? happyCharacterImage : idleCharacterImage;

  const dialogViewerName = dialogNameRef.current || (viewerInfo.viewerNameText || '나');
  const dialogViewerColor = dialogColorRef.current || (viewerInfo.viewerNameColor || '#FFFFFF');

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
                <RewardDiscoverScreen
                  kind={kind}
                  isMyTurn={myTurn}
                  characterImage={idleCharacterImage}
                />
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
                  viewerHouseLevel={viewerInfo.viewerHouseLevel}
                  viewerNameColor={dialogViewerColor}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </AspectLayout>
    </div>
  );
}
