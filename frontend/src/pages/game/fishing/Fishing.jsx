// fishing/Fishing.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import useSpaceKey from '../../../hooks/useSpaceKey.js';
import { useExitHandler } from '../../../hooks/useExitHandler.js';
import { useGameTimer } from '../../../hooks/useGameTimer.js';

import FishingIntro from './FishingIntro.jsx';
import FishingInGame from './FishingInGame.jsx';
import FishingResult from './FishingResult.jsx';

import useFishingEventState from './useFishingEventState.jsx';

import { CHARACTERS } from '../../../constants/characters.js';

import './Fishing.css';

export default function Fishing({
                                  roomId,
                                  isMyTurn,
                                  currentPlayerName,
                                  currentPlayerCharacterId,
                                  timeoutSeconds = 0,
                                  eventMessage,
                                  onExit,
                                  onStartFishing,
                                  onFishingAction,
                                }) {
  // INTRO_CAPTION -> INTRO_BAIT -> INTRO_GUIDE -> INTRO_READY -> PLAYING -> RESULT
  const [step, setStep] = useState('INTRO_CAPTION');

  const { timeLeft, isUrgent, hasTimeOutPanel } = useGameTimer(timeoutSeconds);
  const es = useFishingEventState(eventMessage);

  const doExit = useExitHandler(isMyTurn, () => onExit?.());

  // ✅ bait 선택 저장
  const baitChoiceRef = useRef(false);

  useEffect(() => {
    setStep('INTRO_CAPTION');
    baitChoiceRef.current = false;
  }, [roomId]);

  // ✅ 서버 메시지 기반 step 전환 (관전자도 동일)
  useEffect(() => {
    if (es.isStarted && !es.isResult) setStep('PLAYING');
    if (es.isResult) setStep('RESULT');
  }, [es.isStarted, es.isResult]);

  // ✅ 결과 자동 종료(내 턴만)
  useEffect(() => {
    if (!es.isResult) return;
    if (!isMyTurn) return;

    const t = setTimeout(() => {
      doExit();
    }, 3000);

    return () => clearTimeout(t);
  }, [es.isResult, isMyTurn, doExit]);

  const canControl = useMemo(() => {
    return isMyTurn && es.isStarted && !es.isPendingStart && !es.isExpired && !es.isResult;
  }, [isMyTurn, es.isStarted, es.isPendingStart, es.isExpired, es.isResult]);

  const publishAction = (action) => {
    if (!roomId) return;
    onFishingAction?.(action);
  };

  // LARGE: 펌프(짧게 REEL_START/STOP)
  const pumpTimerRef = useRef(null);
  const pumpPendingRef = useRef(false);

  useEffect(() => {
    return () => {
      if (pumpTimerRef.current) clearTimeout(pumpTimerRef.current);
    };
  }, []);

  const pumpOnce = () => {
    if (!canControl) return;
    if (!es.isLarge) return;
    if (pumpPendingRef.current) return;

    pumpPendingRef.current = true;
    publishAction('REEL_START');

    if (pumpTimerRef.current) clearTimeout(pumpTimerRef.current);
    pumpTimerRef.current = setTimeout(() => {
      publishAction('REEL_STOP');
      pumpPendingRef.current = false;
      pumpTimerRef.current = null;
    }, 120);
  };

  const hitOnce = () => {
    if (!canControl) return;
    publishAction('HIT');
  };

  const requestStart = () => {
    if (!isMyTurn) return;
    // ✅ bait 선택 반영해서 start 요청
    onStartFishing?.(!!baitChoiceRef.current);
  };

  // ✅ SPACE 키
  useSpaceKey(
    () => {
      if (!isMyTurn) return;

      if (step === 'RESULT') {
        doExit();
        return;
      }

      if (step === 'INTRO_CAPTION') {
        if (es.baitAvailable && !es.baitUsed) setStep('INTRO_BAIT');
        else setStep('INTRO_GUIDE');
        return;
      }

      if (step === 'INTRO_GUIDE') {
        // ✅ B 방식: 여기서 INTRO_READY로 가면 대사창은 안 뜨고 Ready UI만 뜸
        setStep('INTRO_READY');
        return;
      }

      if (step === 'INTRO_READY') {
        requestStart();
        return;
      }

      if (step === 'PLAYING') {
        if (es.isLarge) pumpOnce();
        else hitOnce();
      }
    },
    { enabled: true },
  );

  const showTimer = hasTimeOutPanel && step === 'PLAYING' && !es.isResult;

  const safeName = useMemo(() => {
    const s = String(currentPlayerName ?? '').trim();
    return s || '익명의 주민';
  }, [currentPlayerName]);

  const character = useMemo(() => {
    const id = Number(currentPlayerCharacterId);
    if (!Number.isFinite(id)) return null;
    return (CHARACTERS || []).find((c) => Number(c?.id) === id) || null;
  }, [currentPlayerCharacterId]);

  const charSrc = character?.fishingImage;

  // ✅ B 방식: INTRO_READY 전용 Ready 오버레이(대사창 없이)
  const showReadyOverlay = step === 'INTRO_READY' && !es.isStarted && !es.isResult;

  return (
    <div className="bmhFishing-root">
      {/* ✅ 배경 */}
      <div className="bmhFishing-bg" aria-hidden="true" />

      {/* ✅ 캐릭터 항상 노출 */}
      <div className="bmhFishing-charBox">
        {charSrc && <img className="bmhFishing-charImg" src={charSrc} alt="character" draggable={false} />}
      </div>

      {/* ✅ 타이머 (PLAYING에서만) */}
      {showTimer && (
        <div className="bmhFishing-timerWrap">
          <div className="bmhFishing-timerPill">
            <span className="bmhFishing-timerLabel">TIME</span>
            <span className={`bmhFishing-timerValue ${isUrgent ? 'bmhFishing-timerUrgent' : ''}`}>{timeLeft}s</span>
          </div>
        </div>
      )}

      {/* ✅ Intro (INTRO_READY는 제외: 대사창 사라지게) */}
      {(step === 'INTRO_CAPTION' || step === 'INTRO_BAIT' || step === 'INTRO_GUIDE') && (
        <FishingIntro
          step={step}
          isMyTurn={isMyTurn}
          speakerName={safeName}
          speakerCharacter={character}
          baitAvailable={es.baitAvailable && !es.baitUsed}
          onDecideBait={(useBait) => {
            if (!isMyTurn) return;
            baitChoiceRef.current = !!useBait;
            setStep('INTRO_GUIDE');
          }}
          onAutoNext={() => {
            if (step !== 'INTRO_CAPTION') return;
            if (es.baitAvailable && !es.baitUsed) setStep('INTRO_BAIT');
            else setStep('INTRO_GUIDE');
          }}
        />
      )}

      {/* ✅ B 방식 Ready UI: 대사창 없이 문구만 */}
      {showReadyOverlay && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 25020,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            paddingBottom: 'calc(140 * var(--s))',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              pointerEvents: 'none',
              padding: 'calc(18 * var(--s)) calc(26 * var(--s))',
              borderRadius: 'calc(16 * var(--s))',
              background: 'rgba(0, 0, 0, 0.55)',
              color: '#fff',
              fontSize: 'calc(28 * var(--s))',
              fontWeight: 800,
              letterSpacing: 'calc(0.5 * var(--s))',
              textAlign: 'center',
              lineHeight: 1.2,
              userSelect: 'none',
            }}
          >
            스페이스바를 눌러 낚시하기
          </div>
        </div>
      )}

      {/* ✅ InGame */}
      {step === 'PLAYING' && (
        <FishingInGame
          isMyTurn={isMyTurn}
          markerPct={es.markerPct}
          winStartPct={es.winStartPct}
          winEndPct={es.winEndPct}
          inWindow={es.inWindow}
          isLarge={es.isLarge}
          largeProgress={es.largeProgress}
          largeTension={es.largeTension}
          largeReeling={es.largeReeling}
        />
      )}

      {/* ✅ Result */}
      {step === 'RESULT' && (
        <FishingResult isMyTurn={isMyTurn} speakerName={safeName} resultMessage={es.resultMessage} raw={es.raw} />
      )}

      {!isMyTurn && <div className="bmhFishing-spectatorBlock" />}
    </div>
  );
}
