import { useEffect, useMemo, useState, useCallback } from 'react';
import { CHARACTERS } from '../../../constants/characters.js';
import { COLORS, withAlpha } from '../../../constants/colors.js';

import FishingIntro from './FishingIntro.jsx';
import FishingInGame from './FishingInGame.jsx';
import FishingResult from './FishingResult.jsx';

import './Fishing.css';

const pickType = (m) => String(m?.type || ''); // eventMessage type 안전 추출
const isStarted = (m) => pickType(m) === 'ROOM_EVENT_STARTED'; // STARTED 판별
const isUpdate = (m) => pickType(m) === 'ROOM_EVENT_UPDATE'; // UPDATE 판별
const isResult = (m) => pickType(m) === 'ROOM_EVENT_RESULT'; // RESULT 판별

const findCharacter = (characterId) => {
  // 캐릭터 id로 메타 찾기
  const id = Number(characterId);
  if (!Number.isFinite(id)) return null;
  return (CHARACTERS || []).find((c) => Number(c?.id) === id) || null;
};

const FISHING_SIZE_BY_CHAR = {
  2: { h: 480 }, // 미첼
  4: { w: 410 }, // 빙티
  3: { w: 430 }, // 메이플
  1: { w: 360 }, // 애플
};

const buildSizeStyle = (spec) => {
  // 크기 스펙(가로/세로 중 하나) 적용
  if (!spec) return undefined;

  const w = Number(spec.w);
  const h = Number(spec.h);

  if (Number.isFinite(w)) return { width: `calc(${w} * var(--s, 1))`, height: 'auto' };
  if (Number.isFinite(h)) return { width: 'auto', height: `calc(${h} * var(--s, 1))` };

  return undefined;
};

const mapUiStepToIntroStep = (uiStep) => {
  // 서버 uiStep(0/1/2) -> 인트로 단계 매핑
  const s = Number(uiStep);
  if (s === 1) return 'INTRO_BAIT';
  if (s === 2) return 'INTRO_READY';
  return 'INTRO_CAPTION';
};

export default function Fishing({
                                  roomId,
                                  isMyTurn,
                                  currentPlayerName,
                                  currentPlayerCharacterId,
                                  timeoutSeconds = 0,

                                  currentPlayer,

                                  eventMessage,
                                  hasBait = false,

                                  onExit,
                                  onStartFishing,

                                  onGameAction,

                                  onFishingAction,
                                }) {
  const selectedUseBaitFromServer = useMemo(() => {
    // 서버가 저장한 떡밥 선택값(player.actionData) 정규화
    const v = currentPlayer?.actionData;
    return v === 1 || v === '1' || v === true || v === 'true';
  }, [currentPlayer?.actionData]);

  const [startRequested, setStartRequested] = useState(false); // READY에서 start 1회 가드

  const [startedMsg, setStartedMsg] = useState(null);
  const [lastUpdateMsg, setLastUpdateMsg] = useState(null);
  const [resultMsg, setResultMsg] = useState(null);

  const currentChar = useMemo(() => findCharacter(currentPlayerCharacterId), [currentPlayerCharacterId]);
  const charSrc = useMemo(() => currentChar?.fishingImage || null, [currentChar]);

  const nameBoxColor = useMemo(() => {
    // Subtitle nameBox만 캐릭터 고유색으로 주입
    const c = String(currentChar?.color ?? '').trim();
    return c || COLORS.characters.default.nameBox;
  }, [currentChar?.color]);

  const fishingCharImgStyle = useMemo(() => {
    // 낚시 중 캐릭터 이미지 크기(4캐릭) 적용
    const id = Number(currentPlayerCharacterId);
    if (!Number.isFinite(id)) return undefined;
    return buildSizeStyle(FISHING_SIZE_BY_CHAR[id]);
  }, [currentPlayerCharacterId]);

  const introStep = useMemo(() => mapUiStepToIntroStep(currentPlayer?.uiStep), [currentPlayer?.uiStep]);

  const themeVars = useMemo(() => {
    // Fishing 전체 테마 CSS 변수(루트에 주입)
    return {
      '--bmhFishing-subtitleNameBox': nameBoxColor,
      '--bmhFishing-subtitleNameText': COLORS.characters.default.nameText,
      '--bmhFishing-highlightNookCyan': COLORS.ac.nookCyan,

      '--bmhFishing-titleColor': withAlpha(COLORS.ac.white, 0.9),
      '--bmhFishing-titleShadow': `0 2px 14px ${withAlpha(COLORS.ac.black, 0.8)}`,

      '--bmhFishing-trackBg': withAlpha(COLORS.ac.coffeeBrown, 0.5),

      '--bmhFishing-smWindowBg': withAlpha(COLORS.ac.black, 0.7),

      '--bmhFishing-smMarkerBg': withAlpha(COLORS.ac.white, 0.95),
      '--bmhFishing-smMarkerBgFlash': COLORS.ac.nookCyan,

      '--bmhFishing-lgProgressFill': COLORS.ac.nookCyan,
      '--bmhFishing-lgTensionFill': COLORS.ac.red,
    };
  }, [nameBoxColor]);

  useEffect(() => {
    // eventMessage 타입에 따라 STARTED/UPDATE/RESULT 상태 분기 저장
    if (!eventMessage) return;

    if (isStarted(eventMessage)) {
      setStartedMsg(eventMessage);
      setLastUpdateMsg(null);
      setResultMsg(null);
      return;
    }

    if (isUpdate(eventMessage)) {
      setLastUpdateMsg(eventMessage);
      return;
    }

    if (isResult(eventMessage)) {
      setResultMsg(eventMessage);
      setStartedMsg(null);
      setLastUpdateMsg(null);
    }
  }, [eventMessage]);

  useEffect(() => {
    // 인트로로 내려오면(0/1/2) startRequested 해제
    const ui = Number(currentPlayer?.uiStep);
    const inIntro = ui === 0 || ui === 1 || ui === 2 || !Number.isFinite(ui);
    if (inIntro) setStartRequested(false);
  }, [currentPlayer?.uiStep]);

  const handleNextFromCaption = () => {
    // 캡션 -> 다음(step 전진) 요청
    if (!isMyTurn) return;
    if (!onGameAction) return;
    onGameAction('FISHING_INTRO_NEXT', {});
  };

  const handleDecideBait = (useBait) => {
    // 떡밥 사용 여부 선택 요청(actionData=0/1)
    if (!isMyTurn) return;
    if (!onGameAction) return;
    onGameAction('FISHING_INTRO_DECIDE_BAIT', { actionData: useBait ? 1 : 0 });
  };

  const handleProceedFromReady = useCallback(() => {
    // READY에서 startFishing을 한 번만 전송
    if (!isMyTurn) return;
    if (startRequested) return;

    setStartRequested(true);
    onStartFishing?.(!!selectedUseBaitFromServer);
  }, [isMyTurn, startRequested, onStartFishing, selectedUseBaitFromServer]);

  const phase = useMemo(() => {
    // 화면 페이즈 결정(RESULT > INGAME > INTRO)
    if (resultMsg) return 'RESULT';
    if (Number(currentPlayer?.uiStep) === 3) return 'INGAME';
    if (startedMsg) return 'INGAME';
    return 'INTRO';
  }, [resultMsg, currentPlayer?.uiStep, startedMsg]);

  return (
    <div className="bmhFishing-root" role="presentation" style={themeVars}>
      <div className="bmhFishing-bg" aria-hidden="true" />

      <div className="bmhFishing-stage">
        {(phase === 'INTRO' || phase === 'INGAME') && (
          <div className="bmhFishing-charBox" aria-hidden="true">
            {charSrc ? (
              <img
                className="bmhFishing-charImg"
                src={charSrc}
                alt="fishing-character"
                draggable={false}
                style={fishingCharImgStyle}
              />
            ) : null}
          </div>
        )}

        {phase === 'INTRO' && (
          <FishingIntro
            step={introStep}
            isMyTurn={isMyTurn}
            nameText={currentPlayerName || '플레이어'}
            baitAvailable={!!hasBait}
            onNextFromCaption={handleNextFromCaption}
            onDecideBait={handleDecideBait}
            onProceedFromReady={handleProceedFromReady}
          />
        )}

        {phase === 'INGAME' && (
          <FishingInGame
            roomId={roomId}
            isMyTurn={isMyTurn}
            currentPlayerName={currentPlayerName}
            currentPlayerCharacterId={currentPlayerCharacterId}
            timeoutSeconds={timeoutSeconds}
            eventMessage={startedMsg}
            lastUpdateMessage={lastUpdateMsg}
            onFishingAction={onFishingAction}
            onExit={onExit}
          />
        )}

        {phase === 'RESULT' && (
          <FishingResult
            roomId={roomId}
            isMyTurn={isMyTurn}
            currentPlayerName={currentPlayerName}
            currentPlayerCharacterId={currentPlayerCharacterId}
            resultMessage={resultMsg}
            onExit={onExit}
          />
        )}
      </div>
    </div>
  );
}
