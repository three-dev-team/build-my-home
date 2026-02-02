import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import './GatherTile.css';

import GatherDiscoverScreen from './GatherDiscoverScreen.jsx';
import GatherGetScreen from './GatherGetScreen.jsx';

import useSpaceKey from '../../../components/common/useSpaceKey.js';
import { CHARACTERS } from '../../../constants/characters.js';
import { getMyIdFromToken } from '../../../utils/auth.js';

const toBool = (v) => v === true || v === 'true';

// actionDataStr(JSON) 안전 파싱
const safeParseJson = (s) => {
  if (!s || typeof s !== 'string') return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

// gameState.players에서 "현재 플레이 중인 사람" 찾기
const pickCurrentPlayer = (gameState) => {
  const cpId = gameState?.currentPlayerId;
  const players = gameState?.players || [];
  return players.find((p) => Number(p.memberId) === Number(cpId)) || null;
};

// { KEY: count } 형태에서 count>0이 하나라도 있는지
const hasAnyPositive = (obj) =>
  !!obj && typeof obj === 'object' && Object.keys(obj).some((k) => Number(obj?.[k] || 0) > 0);

// 관전자(나) 기준: 닉네임/하우스레벨/이름색(캐릭터색) 뽑기
const pickViewerInfo = (gameState, myId) => {
  const players = Array.isArray(gameState?.players) ? gameState.players : [];

  // 내 플레이어 객체(서버 DTO 키 케이스 차이 대응)
  const me =
    players.find((p) => Number(p?.memberId) === Number(myId)) ||
    players.find((p) => Number(p?.id) === Number(myId)) ||
    players.find((p) => Number(p?.playerId) === Number(myId)) ||
    null;

  // 세션에 저장된 닉네임 fallback(프로젝트마다 키가 달라질 수 있어 다중 대응)
  const ssNick =
    (sessionStorage.getItem('nickname') || '').trim() ||
    (sessionStorage.getItem('nickName') || '').trim() ||
    (sessionStorage.getItem('userNickname') || '').trim() ||
    '';

  const viewerNameText = (me?.nickname && String(me.nickname).trim()) || ssNick || '';

  // 하우스 레벨 키 케이스 대응
  const rawLevel =
    me?.houseLevel ??
    me?.houseLevelNumber ??
    me?.houseLevelValue ??
    me?.houseLv ??
    me?.house ??
    null;

  const n = Number(rawLevel);
  const viewerHouseLevel = Number.isFinite(n) ? n : null;

  // 내 캐릭터색(없으면 흰색)
  const myCharId = me?.characterId ?? me?.charId ?? null;
  const ch = CHARACTERS.find((c) => Number(c.id) === Number(myCharId)) || null;
  const viewerNameColor = ch?.color || '#FFFFFF';

  return { viewerNameText, viewerHouseLevel, viewerNameColor };
};

export default function GatherTile({ roomId, stompClient, gameState, isMyTurn, onDone }) {
  const myTurn = toBool(isMyTurn);

  // 현재 플레이어
  const cp = useMemo(() => pickCurrentPlayer(gameState), [gameState]);

  // 서버 uiStep만 신뢰: 0=Discover, 1=Get/Drop, 2=Complete
  const uiStep = useMemo(() => {
    const v = Number(cp?.uiStep ?? 0);
    return Number.isFinite(v) ? v : 0;
  }, [cp]);

  // 서버가 내려주는 actionDataStr(JSON) 파싱
  const rawActionStr = useMemo(
    () => (cp?.actionDataStr ? String(cp.actionDataStr) : ''),
    [cp?.actionDataStr]
  );
  const parsed = useMemo(() => safeParseJson(rawActionStr), [rawActionStr]);

  // 내 id: sessionStorage.memberId 우선, 없으면 토큰에서 추출
  const myId = useMemo(() => {
    const ssMemberId = Number(sessionStorage.getItem('memberId'));
    if (Number.isFinite(ssMemberId) && ssMemberId > 0) return ssMemberId;

    const token = sessionStorage.getItem('token');
    const idFromToken = getMyIdFromToken(token);
    const nn = Number(idFromToken);
    return Number.isFinite(nn) && nn > 0 ? nn : null;
  }, []);

  // 관전자(나) 기준 정보
  const viewerInfo = useMemo(() => pickViewerInfo(gameState, myId), [gameState, myId]);
  const dialogNameRef = useRef('');
  const dialogColorRef = useRef('#FFFFFF');

  useEffect(() => {
    const players = Array.isArray(gameState?.players) ? gameState.players : [];
    const myNick = String(viewerInfo?.viewerNameText || '').trim();

    // 관전이면 내 이름 고정
    if (!myTurn) {
      dialogNameRef.current = myNick || '나';
      dialogColorRef.current = viewerInfo?.viewerNameColor || '#FFFFFF';
      return;
    }

    // 내 턴이면 나 제외한 닉네임 풀에서 랜덤 1명 선택
    const pool = players
      .filter((p) => {
        const nick = String(p?.nickname ?? '').trim();
        if (!nick) return false;
        if (myNick && nick === myNick) return false; // 닉네임 기준 제외
        if (myId != null && Number(p?.memberId) === Number(myId)) return false; // id 기준 제외
        return true;
      })
      .map((p) => ({
        nickname: String(p.nickname).trim(),
        characterId: p?.characterId ?? p?.charId ?? null,
      }));

    // 남는 사람이 없으면 내 이름으로 fallback
    if (!pool.length) {
      dialogNameRef.current = myNick || '나';
      dialogColorRef.current = viewerInfo?.viewerNameColor || '#FFFFFF';
      return;
    }

    const picked = pool[Math.floor(Math.random() * pool.length)];
    dialogNameRef.current = picked.nickname;

    // 가능하면 선택된 플레이어의 캐릭터색 사용
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

  // 화면 렌더에 필요한 파생 데이터 모음
  const derived = useMemo(() => {
    // kind 결정(서버 parsed.kind 우선, 없으면 status로 추론)
    const status = gameState?.status;
    const defaultKind = status === 'WAITING_HARVEST' ? 'fruit' : 'resource';
    const kind = parsed?.kind === 'fruit' || parsed?.kind === 'resource' ? parsed.kind : defaultKind;

    // 현재 플레이어 캐릭터 이미지(기본/해피)
    const ch = CHARACTERS.find((c) => Number(c.id) === Number(cp?.characterId)) || null;
    const idleCharacterImage = ch?.selectBasicImage || ch?.iconIdle || ch?.roomListImage || '';
    const happyCharacterImage = ch?.happyImage || idleCharacterImage;

    // 이름 박스는 현재 플레이 중인 사람 닉네임으로 고정
    const cpNickname = String(cp?.nickname ?? '').trim() || '곰돌';
    const nameColor = ch?.color || '#EB5757';

    // gained: 서버 actionDataStr.gained 우선, 없으면 gameState의 gainedResources/gainedHarvests fallback
    const gainedFromServer = parsed?.gained && typeof parsed.gained === 'object' ? parsed.gained : null;

    const hasRes = gameState?.gainedResources && Object.keys(gameState.gainedResources).length > 0;
    const hasHar = gameState?.gainedHarvests && Object.keys(gameState.gainedHarvests).length > 0;

    const gainedFallback =
      kind === 'fruit'
        ? (hasHar ? gameState.gainedHarvests : null)
        : (hasRes ? gameState.gainedResources : null);

    const gained = hasAnyPositive(gainedFromServer) ? gainedFromServer : (gainedFallback || {});

    // dropKeys: 서버 dropKeys 우선, 없으면 gained의 상위 2개 키로 구성
    let dropKeys = Array.isArray(parsed?.dropKeys) ? parsed.dropKeys.filter(Boolean) : [];

    if (!dropKeys.length && gained && typeof gained === 'object') {
      const keys = Object.keys(gained).filter((k) => Number(gained?.[k] || 0) > 0);
      dropKeys = keys.slice(0, 2);
    }

    // 자막용 텍스트(템플릿 문자열 보호)
    const rawPlayerName = parsed?.playerNameText || parsed?.playername || parsed?.playerName || cpNickname;
    const playerNameText =
      typeof rawPlayerName === 'string' && rawPlayerName.includes('${') ? cpNickname : rawPlayerName;

    const rawNext =
      parsed?.nextHouseLevelText ||
      (parsed?.nextHouseLevel !== undefined && parsed?.nextHouseLevel !== null
        ? `Lv.${parsed.nextHouseLevel}`
        : '');
    const nextHouseLevelText = typeof rawNext === 'string' && rawNext.includes('${') ? '' : rawNext;

    return {
      kind,
      idleCharacterImage,
      happyCharacterImage,
      cpNickname,
      nameColor,
      dropKeys,
      playerNameText,
      nextHouseLevelText,
    };
  }, [gameState, cp, parsed]);

  const {
    kind,
    idleCharacterImage,
    happyCharacterImage,
    cpNickname,
    nameColor,
    dropKeys,
    playerNameText,
    nextHouseLevelText,
  } = derived;

  // 드랍 연출 재실행 트리거(id 변경 시 자식에서 재생)
  const [dropRunId, setDropRunId] = useState(0);

  // Complete 단계에서도 상단 보상 슬롯이 유지되도록 고정 키 저장
  const [fixedKeys, setFixedKeys] = useState([null, null]);

  const prevUiStepRef = useRef(uiStep);

  // Complete 자동 종료 제어(중복 호출 방지 + 시작 시각)
  const doneCalledRef = useRef(false);
  const completeStartedAtRef = useRef(0);

  // 서버 액션 전송
  const sendAction = useCallback(
    (type) => {
      if (!stompClient || !roomId) return;
      try {
        stompClient.publish({
          destination: '/app/games/action',
          body: JSON.stringify({ roomId, type }),
        });
      } catch {
        // noop
      }
    },
    [stompClient, roomId]
  );

  // uiStep 전환 시 상태 초기화
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

    if (uiStep === 1) {
      setFixedKeys([null, null]);
      setDropRunId((v) => v + 1);
      doneCalledRef.current = false;
      completeStartedAtRef.current = 0;
      return;
    }

    if (uiStep === 2) {
      completeStartedAtRef.current = Date.now();
    }
  }, [uiStep]);

  // Complete 진입 시 fixedKeys가 비어있으면 dropKeys로 채워두기
  useEffect(() => {
    if (uiStep !== 2) return;

    const left = dropKeys?.[0] || null;
    const right = dropKeys?.[1] || null;
    if (!left && !right) return;

    setFixedKeys((prev) => {
      const p0 = prev?.[0] ?? null;
      const p1 = prev?.[1] ?? null;
      return [p0 || left, p1 || right];
    });
  }, [uiStep, dropKeys]);

  // Get/Drop 단계 진입 후 일정 시간 지나면 자동으로 Complete 요청(내 턴만)
  useEffect(() => {
    if (!myTurn) return;
    if (uiStep !== 1) return;

    const t = window.setTimeout(() => {
      sendAction('GATHER_NEXT');
    }, 1200);

    return () => window.clearTimeout(t);
  }, [uiStep, myTurn, sendAction]);

  // 드랍 1개 완료 시 fixedKeys에 반영
  const onDropOneDone = useCallback(({ index, key }) => {
    setFixedKeys((prev) => {
      const next = Array.isArray(prev) ? [...prev] : [null, null];
      if ((index === 0 || index === 1) && key) next[index] = key;
      return next;
    });
  }, []);

  // Space: Discover에서 Confirm (내 턴만)
  const onSpaceAtDiscover = useCallback(() => {
    if (!myTurn) return;
    if (uiStep !== 0) return;
    sendAction('GATHER_CONFIRM');
  }, [myTurn, uiStep, sendAction]);

  // Space: Get/Drop에서 Next (내 턴만)
  const onSpaceAtGet = useCallback(() => {
    if (!myTurn) return;
    if (uiStep !== 1) return;
    sendAction('GATHER_NEXT');
  }, [myTurn, uiStep, sendAction]);

  useSpaceKey(onSpaceAtDiscover, { enabled: myTurn && uiStep === 0 });
  useSpaceKey(onSpaceAtGet, { enabled: myTurn && uiStep === 1 });

  // Complete 단계에서 3초 후 자동 종료(내 턴만)
  useEffect(() => {
    if (uiStep !== 2) return;
    if (!myTurn) return;

    const startedAt = completeStartedAtRef.current || Date.now();
    const remain = Math.max(0, 3000 - (Date.now() - startedAt));

    const t = window.setTimeout(() => {
      if (doneCalledRef.current) return;
      doneCalledRef.current = true;
      onDone?.();
    }, remain);

    return () => window.clearTimeout(t);
  }, [uiStep, myTurn, onDone]);

  // 단계별 표시 플래그
  const showDrop = uiStep === 1;
  const showSubtitle = uiStep === 2;
  const characterImage = showSubtitle ? happyCharacterImage : idleCharacterImage;

  // dropKeys를 0~2개 배열로 정규화
  const dropKeysNormalized = useMemo(() => {
    const a = dropKeys?.[0] || null;
    const b = dropKeys?.[1] || null;
    const arr = [];
    if (a) arr.push(a);
    if (b) arr.push(b);
    return arr;
  }, [dropKeys]);

  // 대사에 사용할 이름/색(관전=내 이름, 내턴=나 제외 랜덤)
  const dialogViewerName = dialogNameRef.current || (viewerInfo.viewerNameText || '나');
  const dialogViewerColor = dialogColorRef.current || (viewerInfo.viewerNameColor || '#FFFFFF');

  return (
    <div className="gathertile-root" role="dialog" aria-modal="true">
      <div className={`gathertile-bg ${kind}`} aria-hidden="true" />

      <div className="gathertile-safe">
        <div className="gathertile-screen">
          <AnimatePresence mode="wait">
            {uiStep === 0 && (
              <motion.div
                key="discover"
                className="gathertile-layer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <GatherDiscoverScreen kind={kind} isMyTurn={myTurn} characterImage={idleCharacterImage} />
              </motion.div>
            )}

            {(uiStep === 1 || uiStep === 2) && (
              <motion.div
                key="getOrComplete"
                className="gathertile-layer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <GatherGetScreen
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
                  nextHouseLevelText={nextHouseLevelText}
                  playerNameText={playerNameText}
                  viewerNameText={dialogViewerName}
                  viewerHouseLevel={viewerInfo.viewerHouseLevel}
                  viewerNameColor={dialogViewerColor}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
