import { useEffect, useMemo, useRef, useState } from 'react';
import { useGameTimer } from '../../hooks/useGameTimer.js';
import './css/Fishing.css';

const INTRO_IMAGE_1 = '/images/fishing/justin_intro.webp'; // 인트로 1 이미지
const INTRO_IMAGE_2 = '/images/fishing/justin_start.webp'; // 인트로 2 이미지

const RESULT_SUCCESS_IMAGE = '/images/fishing/success_fishing.webp'; // 성공 결과 이미지
const RESULT_FAIL_IMAGE = '/images/fishing/fail_fishing.webp'; // 실패 결과 이미지

const clamp0to100 = (v) => Math.max(0, Math.min(100, v)); // 0~100 범위

function computePingPongMarkerPct(startAtEpochMs, nowEpochMs, cycleMs) {
  if (!cycleMs || cycleMs <= 0) return 0;
  const elapsed = Math.max(0, nowEpochMs - startAtEpochMs);
  const mod = elapsed % cycleMs;
  const phase = mod / cycleMs; // 0..1

  if (phase <= 0.5) return clamp0to100(phase * 2 * 100); // 0 -> 100
  return clamp0to100((1 - (phase - 0.5) * 2) * 100); // 100 -> 0
}

export default function Fishing({
  roomId,
  isMyTurn,
  currentPlayerName,
  timeoutSeconds = 0,
  eventMessage,
  onExit,
  onStartFishing,
  onFishingAction,
}) {
  // 공통 타이머 UI
  const { timeLeft, isUrgent, hasTimeOutPanel } = useGameTimer(timeoutSeconds);

  const isSpectator = !isMyTurn; // 관전 여부

  // 타이머 ref
  const onExitRef = useRef(onExit);
  useEffect(() => {
    onExitRef.current = onExit;
  }, [onExit]);

  // 종료 1회 가드
  const exitOnceRef = useRef(false);

  // 시작 잠금 해제 타이머 ref
  const startUnlockTimerRef = useRef(null);

  // 결과 자동 종료 타이머 ref
  const resultAutoExitTimerRef = useRef(null);

  // event-complete는 내 턴만 호출
  const doExit = () => {
    if (!isMyTurn) return; // 관전자는 종료 신호 금지

    if (exitOnceRef.current) return;
    exitOnceRef.current = true;

    if (startUnlockTimerRef.current) {
      clearTimeout(startUnlockTimerRef.current);
      startUnlockTimerRef.current = null;
    }
    if (resultAutoExitTimerRef.current) {
      clearTimeout(resultAutoExitTimerRef.current);
      resultAutoExitTimerRef.current = null;
    }

    if (onExitRef.current) onExitRef.current();
  };

  // 화면 단계 상태
  const [uiStep, setUiStep] = useState('INTRO_1'); // INTRO_1 INTRO_2 INGAME

  // 시작 중복 방지 상태
  const [startPending, setStartPending] = useState(false);

  // 시작 요청 1회 가드
  const startRequestedRef = useRef(false);

  useEffect(() => {
    // 방 변경 시 초기화
    setUiStep('INTRO_1');
    setStartPending(false);
    startRequestedRef.current = false;

    exitOnceRef.current = false;

    if (startUnlockTimerRef.current) {
      clearTimeout(startUnlockTimerRef.current);
      startUnlockTimerRef.current = null;
    }
    if (resultAutoExitTimerRef.current) {
      clearTimeout(resultAutoExitTimerRef.current);
      resultAutoExitTimerRef.current = null;
    }
  }, [roomId]);

  useEffect(() => {
    // 언마운트 정리
    return () => {
      if (startUnlockTimerRef.current) {
        clearTimeout(startUnlockTimerRef.current);
        startUnlockTimerRef.current = null;
      }
      if (resultAutoExitTimerRef.current) {
        clearTimeout(resultAutoExitTimerRef.current);
        resultAutoExitTimerRef.current = null;
      }
    };
  }, []);

  const requestStart = () => {
    if (!isMyTurn) return; // 시작은 내 턴만
    if (!roomId) return;
    if (startPending) return;
    if (!onStartFishing) return;

    if (startRequestedRef.current) return;
    startRequestedRef.current = true;

    setStartPending(true);
    onStartFishing();

    // STARTED 미수신 시 잠금 해제
    if (startUnlockTimerRef.current) {
      clearTimeout(startUnlockTimerRef.current);
      startUnlockTimerRef.current = null;
    }
    startUnlockTimerRef.current = setTimeout(() => {
      if (startRequestedRef.current) {
        startRequestedRef.current = false;
        setStartPending(false);
      }
      startUnlockTimerRef.current = null;
    }, 3000);
  };

  const handleIntroTap = () => {
    if (isSpectator) return; // 관전자는 인트로도 차단
    if (started || result) return;

    if (uiStep === 'INTRO_1') {
      setUiStep('INTRO_2');
      return;
    }

    if (uiStep === 'INTRO_2') {
      requestStart();
    }
  };

  // 시간 기준 값
  const [nowPerf, setNowPerf] = useState(() => performance.now());
  const [epochOffsetMs] = useState(() => Date.now() - performance.now());
  const nowEpoch = useMemo(() => nowPerf + epochOffsetMs, [nowPerf, epochOffsetMs]);

  // 서버 시간 오차 보정 값
  const [serverSkewMs, setServerSkewMs] = useState(0);
  const serverSkewRef = useRef(0);

  // 메시지 스냅샷 상태
  const [startedMsg, setStartedMsg] = useState(null);
  const [updateMsg, setUpdateMsg] = useState(null);
  const [resultMsg, setResultMsg] = useState(null);

  // LARGE 보간 상태
  const [smoothProgress, setSmoothProgress] = useState(0);
  const [smoothTension, setSmoothTension] = useState(0);

  const smoothProgressRef = useRef(0);
  const smoothTensionRef = useRef(0);
  const targetProgressRef = useRef(0);
  const targetTensionRef = useRef(0);
  const lastPerfRef = useRef(null);

  const rafRef = useRef(0);

  useEffect(() => {
    // serverTimeMs 기반 스큐 갱신
    const st = Number(eventMessage?.serverTimeMs ?? 0);
    if (!st) return;

    const clientNow = Date.now();
    const measured = st - clientNow;

    serverSkewRef.current = serverSkewRef.current === 0 ? measured : serverSkewRef.current * 0.9 + measured * 0.1;

    setServerSkewMs(serverSkewRef.current);
  }, [eventMessage?.serverTimeMs]);

  const syncedNowEpoch = nowEpoch + serverSkewMs; // 서버 기준 now

  useEffect(() => {
    // started 동안만 rAF 루프
    const shouldTick = !!startedMsg && !resultMsg;
    if (!shouldTick) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      return;
    }

    lastPerfRef.current = null;

    const loop = (t) => {
      setNowPerf(t);

      const ht = startedMsg?.harvestType ?? startedMsg?.params?.harvestType;
      const activeLarge = ht === 'FISH_LARGE';

      if (activeLarge) {
        const last = lastPerfRef.current ?? t;
        const dt = Math.max(0, t - last);
        lastPerfRef.current = t;

        const tauMs = 90;
        const alpha = 1 - Math.exp(-dt / tauMs);

        const tp = targetProgressRef.current;
        const tt = targetTensionRef.current;

        const nextP = smoothProgressRef.current + (tp - smoothProgressRef.current) * alpha;
        const nextT = smoothTensionRef.current + (tt - smoothTensionRef.current) * alpha;

        smoothProgressRef.current = nextP;
        smoothTensionRef.current = nextT;

        setSmoothProgress(nextP);
        setSmoothTension(nextT);
      } else {
        lastPerfRef.current = t;
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
  }, [startedMsg, resultMsg]);

  useEffect(() => {
    // eventMessage 분기 저장
    if (!eventMessage?.type) return;

    if (eventMessage.type === 'ROOM_EVENT_STARTED') {
      setStartedMsg(eventMessage);
      setUpdateMsg(null);
      setResultMsg(null);

      setUiStep('INGAME');

      setStartPending(false);
      startRequestedRef.current = false;
      if (startUnlockTimerRef.current) {
        clearTimeout(startUnlockTimerRef.current);
        startUnlockTimerRef.current = null;
      }

      smoothProgressRef.current = 0;
      smoothTensionRef.current = 0;
      setSmoothProgress(0);
      setSmoothTension(0);

      return;
    }

    if (eventMessage.type === 'ROOM_EVENT_UPDATE') {
      setUpdateMsg((prev) => ({ ...(prev ?? {}), ...(eventMessage ?? {}) }));
      return;
    }

    if (eventMessage.type === 'ROOM_EVENT_RESULT') {
      setResultMsg(eventMessage);
      setUiStep('INGAME');

      setStartPending(false);
      startRequestedRef.current = false;
      if (startUnlockTimerRef.current) {
        clearTimeout(startUnlockTimerRef.current);
        startUnlockTimerRef.current = null;
      }
      return;
    }

    if (eventMessage.type === 'ERROR') {
      setResultMsg({
        type: 'ROOM_EVENT_RESULT',
        eventType: 'FISHING',
        success: false,
        message: eventMessage?.message ?? '낚시 진행 중 오류가 발생했어요.',
        gainedQty: 0,
        price: 0,
      });

      setUiStep('INGAME');

      setStartPending(false);
      startRequestedRef.current = false;
      if (startUnlockTimerRef.current) {
        clearTimeout(startUnlockTimerRef.current);
        startUnlockTimerRef.current = null;
      }
    }
  }, [eventMessage]);

  const started = !!startedMsg; // 시작 여부
  const result = !!resultMsg; // 결과 여부

  useEffect(() => {
    // 결과 자동 종료는 내 턴만
    if (!result) return;

    if (resultAutoExitTimerRef.current) {
      clearTimeout(resultAutoExitTimerRef.current);
      resultAutoExitTimerRef.current = null;
    }

    if (isMyTurn) {
      resultAutoExitTimerRef.current = setTimeout(() => {
        doExit();
      }, 3000);
    }

    return () => {
      if (resultAutoExitTimerRef.current) {
        clearTimeout(resultAutoExitTimerRef.current);
        resultAutoExitTimerRef.current = null;
      }
    };
  }, [result, resultMsg, isMyTurn]);

  const harvestType = useMemo(() => {
    // FISH_SMALL FISH_MEDIUM FISH_LARGE
    const ht = startedMsg?.harvestType ?? startedMsg?.params?.harvestType;
    return typeof ht === 'string' ? ht : '';
  }, [startedMsg]);

  const isSmall = harvestType === 'FISH_SMALL';
  const isMedium = harvestType === 'FISH_MEDIUM';
  const isLarge = harvestType === 'FISH_LARGE';

  const startAt = started ? Number(startedMsg?.eventStartTimeMs ?? 0) : 0;
  const durationMs = started ? Number(startedMsg?.durationMs ?? 0) : 0;

  const elapsed = started ? syncedNowEpoch - startAt : 0;
  const clampedElapsed = started && durationMs > 0 ? Math.max(0, Math.min(durationMs, elapsed)) : 0;

  const isPendingStart = started && elapsed < 0;
  const isExpired = started && durationMs > 0 && elapsed > durationMs;

  const stage = useMemo(() => {
    // 중형 단계 값
    const st = updateMsg?.stage ?? startedMsg?.params?.stage ?? 1;
    return Number(st || 1);
  }, [updateMsg, startedMsg]);

  const gaugeCycleMs = useMemo(() => {
    const v = startedMsg?.params?.gaugeCycleMs;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }, [startedMsg]);

  const usePingPongGauge = started && !isLarge && gaugeCycleMs > 0;

  const windowCenterPct = useMemo(() => {
    if (!started) return 0;
    const p = startedMsg?.params ?? {};
    if (!isMedium) return Number(p.firstWindowCenterPct ?? 0) || 0;
    return stage === 2 ? Number(p.secondWindowCenterPct ?? 0) || 0 : Number(p.firstWindowCenterPct ?? 0) || 0;
  }, [started, startedMsg, isMedium, stage]);

  const windowWidthPct = useMemo(() => {
    if (!started) return 0;
    const p = startedMsg?.params ?? {};
    if (!isMedium) return Number(p.firstWindowWidthPct ?? 0) || 0;
    return stage === 2 ? Number(p.secondWindowWidthPct ?? 0) || 0 : Number(p.firstWindowWidthPct ?? 0) || 0;
  }, [started, startedMsg, isMedium, stage]);

  const pingPongMarkerPct = useMemo(() => {
    if (!usePingPongGauge) return 0;
    return computePingPongMarkerPct(startAt, syncedNowEpoch, gaugeCycleMs);
  }, [usePingPongGauge, startAt, syncedNowEpoch, gaugeCycleMs]);

  const biteDelay = useMemo(() => {
    // 단방향 계산 값
    if (!started) return 0;
    if (isSmall) return Number(startedMsg?.params?.firstBiteDelayMs ?? 0);
    if (isMedium) {
      return stage === 2
        ? Number(startedMsg?.params?.secondBiteDelayMs ?? 0)
        : Number(startedMsg?.params?.firstBiteDelayMs ?? 0);
    }
    return 0;
  }, [started, startedMsg, isSmall, isMedium, stage]);

  const successDuration = useMemo(() => {
    // 단방향 계산 값
    if (!started) return 0;
    if (isSmall) return Number(startedMsg?.params?.firstSuccessDurationMs ?? 0);
    if (isMedium) {
      return stage === 2
        ? Number(startedMsg?.params?.secondSuccessDurationMs ?? 0)
        : Number(startedMsg?.params?.firstSuccessDurationMs ?? 0);
    }
    return 0;
  }, [started, startedMsg, isSmall, isMedium, stage]);

  const markerPct = useMemo(() => {
    if (!started) return 0;
    if (usePingPongGauge) return pingPongMarkerPct;
    return durationMs > 0 ? (clampedElapsed / durationMs) * 100 : 0;
  }, [started, usePingPongGauge, pingPongMarkerPct, durationMs, clampedElapsed]);

  const winStartPct = useMemo(() => {
    if (!started) return 0;
    if (usePingPongGauge) return clamp0to100(windowCenterPct - windowWidthPct / 2);
    return durationMs > 0 ? (biteDelay / durationMs) * 100 : 0;
  }, [started, usePingPongGauge, windowCenterPct, windowWidthPct, durationMs, biteDelay]);

  const winEndPct = useMemo(() => {
    if (!started) return 0;
    if (usePingPongGauge) return clamp0to100(windowCenterPct + windowWidthPct / 2);
    return durationMs > 0 ? ((biteDelay + successDuration) / durationMs) * 100 : 0;
  }, [started, usePingPongGauge, windowCenterPct, windowWidthPct, durationMs, biteDelay, successDuration]);

  const inWindow = useMemo(() => {
    if (!started) return false;

    if (usePingPongGauge) {
      const start = winStartPct;
      const end = winEndPct;
      return start <= markerPct && markerPct <= end;
    }

    return clampedElapsed >= biteDelay && clampedElapsed <= biteDelay + successDuration;
  }, [started, usePingPongGauge, winStartPct, winEndPct, markerPct, clampedElapsed, biteDelay, successDuration]);

  const canControl = isMyTurn && started && !isPendingStart && !isExpired && !result; // 조작 가능 여부

  const largeProgress = useMemo(() => {
    const v = updateMsg?.progress ?? startedMsg?.params?.progress ?? 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }, [updateMsg, startedMsg]);

  const largeTension = useMemo(() => {
    const v = updateMsg?.tension ?? startedMsg?.params?.tension ?? 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }, [updateMsg, startedMsg]);

  const largeReeling = useMemo(() => {
    const v = updateMsg?.reeling ?? startedMsg?.params?.reeling ?? false;
    return !!v;
  }, [updateMsg, startedMsg]);

  const tensionCooldownPerMs = useMemo(() => {
    // 서버 tick 없이 클라 계산 값
    const v = startedMsg?.params?.tensionCooldownPerMs ?? 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }, [startedMsg]);

  const lastServerTimeMs = useMemo(() => {
    const v = updateMsg?.serverTimeMs ?? startedMsg?.serverTimeMs ?? 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }, [updateMsg, startedMsg]);

  const liveLargeTension = useMemo(() => {
    if (!started || !isLarge) return largeTension;
    if (largeReeling) return largeTension;
    if (!tensionCooldownPerMs || !lastServerTimeMs) return largeTension;

    const delta = syncedNowEpoch - lastServerTimeMs;
    if (delta <= 0) return largeTension;

    return clamp0to100(largeTension - delta * tensionCooldownPerMs);
  }, [started, isLarge, largeTension, largeReeling, tensionCooldownPerMs, lastServerTimeMs, syncedNowEpoch]);

  useEffect(() => {
    // 보간 목표 갱신
    targetProgressRef.current = clamp0to100(largeProgress);
    targetTensionRef.current = clamp0to100(liveLargeTension);

    if (isLarge && started && !result) {
      if (smoothProgressRef.current === 0 && targetProgressRef.current > 0) {
        smoothProgressRef.current = targetProgressRef.current;
        setSmoothProgress(targetProgressRef.current);
      }
      if (smoothTensionRef.current === 0 && targetTensionRef.current > 0) {
        smoothTensionRef.current = targetTensionRef.current;
        setSmoothTension(targetTensionRef.current);
      }
    }
  }, [isLarge, started, result, largeProgress, liveLargeTension]);

  const publishAction = (action) => {
    if (!onFishingAction) return;
    if (!roomId) return;
    onFishingAction(action);
  };

  const onHit = () => {
    if (!canControl) return;
    publishAction('HIT');
  };

  const pumpTimerRef = useRef(null);
  const pumpPendingRef = useRef(false);
  const lastPumpClientEpochRef = useRef(0);

  const minPumpIntervalMs = useMemo(() => {
    const v = startedMsg?.params?.minPumpIntervalMs;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }, [startedMsg]);

  useEffect(() => {
    return () => {
      if (pumpTimerRef.current) {
        clearTimeout(pumpTimerRef.current);
        pumpTimerRef.current = null;
      }
    };
  }, []);

  const pumpOnce = () => {
    if (!canControl) return;
    if (!isLarge) return;

    const now = Date.now();
    if (minPumpIntervalMs > 0 && now - lastPumpClientEpochRef.current < minPumpIntervalMs) return;
    if (pumpPendingRef.current) return;

    pumpPendingRef.current = true;
    lastPumpClientEpochRef.current = now;

    publishAction('REEL_START');

    if (pumpTimerRef.current) clearTimeout(pumpTimerRef.current);
    pumpTimerRef.current = setTimeout(() => {
      publishAction('REEL_STOP');
      pumpPendingRef.current = false;
      pumpTimerRef.current = null;
    }, 120);
  };

  const handleOkClick = () => {
    doExit();
  };

  const resultTitle = result ? (resultMsg?.success ? '성공!' : '실패') : '';
  const resultText = result ? resultMsg?.message : '';

  const [flashHint, setFlashHint] = useState('');
  useEffect(() => {
    const msg = updateMsg?.message;
    if (!msg) return;
    if (isLarge) return;

    setFlashHint(String(msg));
    const t = setTimeout(() => setFlashHint(''), 450);
    return () => clearTimeout(t);
  }, [updateMsg?.message, isLarge]);

  const hintText = useMemo(() => {
    if (flashHint) return flashHint;

    if (!started) return '낚시 준비중…';
    if (isPendingStart) return '낚싯줄 던지는 중…';
    if (isExpired) return '시간 끝!';

    if (isSpectator) {
      if (isLarge) return largeReeling ? '펌프 중! (SPACE)' : '펌프 타이밍! (SPACE)';
      if (inWindow) return '지금 HIT 타이밍! (SPACE)';
      if (isMedium) return stage === 2 ? '2단계 타이밍! (SPACE)' : '1단계 기다렸다가 (SPACE)';
      return '타이밍 기다렸다가 (SPACE)';
    }

    if (isLarge) return largeReeling ? 'SPACE로 펌프!' : 'SPACE를 눌러 펌프!';
    if (inWindow) return '지금 SPACE!';
    if (isMedium) return stage === 2 ? '2단계! 기다렸다가 SPACE!' : '1단계! 기다렸다가 SPACE!';
    return '타이밍 기다렸다가 SPACE!';
  }, [flashHint, started, isPendingStart, isExpired, isSpectator, isLarge, largeReeling, inWindow, isMedium, stage]);

  const titleRight = useMemo(() => {
    if (isSmall) return '소형';
    if (isMedium) return `중형 (단계 ${stage}/2)`;
    if (isLarge) return '대형 (스페이스 펌프)';
    return '';
  }, [isSmall, isMedium, isLarge, stage]);

  const displayProgress = isLarge ? smoothProgress : largeProgress;
  const displayTension = isLarge ? smoothTension : largeTension;

  const showIntro = !started && !result && (uiStep === 'INTRO_1' || uiStep === 'INTRO_2');
  const introBg = uiStep === 'INTRO_1' ? INTRO_IMAGE_1 : INTRO_IMAGE_2;

  const spaceDownRef = useRef(false);

  const keyHandlerRef = useRef(null);
  useEffect(() => {
    keyHandlerRef.current = (e) => {
      const isSpace = e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar';
      if (!isSpace) return;

      if (e.repeat) return;

      if (showIntro) return;
      if (result) return;
      if (!canControl) return;

      if (spaceDownRef.current) return;
      spaceDownRef.current = true;

      e.preventDefault();

      if (isLarge) pumpOnce();
      else onHit();
    };
  }, [showIntro, result, canControl, isLarge, onHit]);

  useEffect(() => {
    const onKeyDown = (e) => keyHandlerRef.current?.(e);

    const onKeyUp = (e) => {
      const isSpace = e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar';
      if (!isSpace) return;
      spaceDownRef.current = false;
    };

    const onBlur = () => {
      spaceDownRef.current = false;
    };

    window.addEventListener('keydown', onKeyDown, { passive: false, capture: true });
    window.addEventListener('keyup', onKeyUp, { capture: true });
    window.addEventListener('blur', onBlur);

    return () => {
      window.removeEventListener('keydown', onKeyDown, { capture: true });
      window.removeEventListener('keyup', onKeyUp, { capture: true });
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  const resultImageSrc = useMemo(() => {
    if (!result) return '';
    return resultMsg?.success ? RESULT_SUCCESS_IMAGE : RESULT_FAIL_IMAGE;
  }, [result, resultMsg]);

  return (
    <div className="bmhFishingOverlay">
      <div className="bmhFishingStage">
        {isSpectator && (
          <div
            className="bmhFishingSpectatorBlock"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          />
        )}

        {showIntro && (
          <div
            style={{ position: 'absolute', inset: 0 }}
            onClick={handleIntroTap}
            onTouchStart={(e) => {
              e.preventDefault();
              handleIntroTap();
            }}
          >
            <div className="bmhFishingBg" style={{ backgroundImage: `url(${introBg})` }} />

            <div className="bmhFishingTapHint">화면을 터치해주세요</div>

            {hasTimeOutPanel && (
              <div className="bmhFishingTimerWrap">
                <div className="bmhFishingTimerPill">
                  <span className="bmhFishingTimerLabel">TIME</span>
                  <span className={`bmhFishingTimerValue ${isUrgent ? 'bmhFishingTimerUrgent' : ''}`}>{timeLeft}s</span>
                </div>
              </div>
            )}

            {uiStep === 'INTRO_2' && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'flex-end',
                  padding: 22,
                }}
              >
                {isMyTurn ? (
                  <button
                    className="bmhFishingHitBtn"
                    onClick={(e) => {
                      e.stopPropagation();
                      requestStart();
                    }}
                    disabled={startPending}
                    style={{
                      opacity: startPending ? 0.6 : 1,
                      cursor: startPending ? 'not-allowed' : 'pointer',
                      padding: '12px 18px',
                      borderRadius: 16,
                      fontSize: 16,
                    }}
                  >
                    {startPending ? '시작 중...' : '시작하기'}
                  </button>
                ) : (
                  <div className="bmhFishingSpectatorPill">
                    {currentPlayerName ? `${currentPlayerName}님 시작 대기 중` : '시작 대기 중'}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {!showIntro && (
          <>
            <div className="bmhFishingBg" style={{ backgroundImage: 'url(/images/fishing/bg.webp)' }} />

            {hasTimeOutPanel && !result && (
              <div className="bmhFishingTimerWrap">
                <div className="bmhFishingTimerPill">
                  <span className="bmhFishingTimerLabel">TIME</span>
                  <span className={`bmhFishingTimerValue ${isUrgent ? 'bmhFishingTimerUrgent' : ''}`}>{timeLeft}s</span>
                </div>
              </div>
            )}

            <img
              src="/images/fishing/character.webp"
              alt="character"
              className="bmhFishingCharacter"
              draggable={false}
            />

            <div className="bmhFishingBobberWrap">
              <img
                src="/images/fishing/bobber.webp"
                alt="bobber"
                className="bmhFishingBobber"
                style={{ animationDuration: !isLarge && inWindow ? '0.55s' : '1.1s' }}
                draggable={false}
              />
              <img
                src="/images/fishing/ripple.webp"
                alt="ripple"
                className="bmhFishingRipple"
                style={{ opacity: !isLarge && inWindow ? 0.95 : 0.55 }}
                draggable={false}
              />
              {!isLarge && inWindow && (
                <img src="/images/fishing/splash.webp" alt="splash" className="bmhFishingSplash" draggable={false} />
              )}
            </div>

            <div className="bmhFishingHud">
              <div className="bmhFishingTitleRow">
                <div className="bmhFishingTitleText">낚시</div>
                <div className="bmhFishingSubText">
                  {currentPlayerName ? `${currentPlayerName} 차례` : ''}
                  {titleRight ? ` · ${titleRight}` : ''}
                  {!isMyTurn ? ' · 관전 중' : ''}
                </div>
              </div>

              {!isLarge && (
                <div className="bmhFishingGaugeWrap">
                  <div className="bmhFishingGaugeTrack">
                    {started && (
                      <div
                        className="bmhFishingGaugeWindow"
                        style={{
                          left: `${clamp0to100(winStartPct)}%`,
                          width: `${Math.max(0, clamp0to100(winEndPct) - clamp0to100(winStartPct))}%`,
                          opacity: isPendingStart ? 0.2 : 0.85,
                        }}
                      />
                    )}

                    {started && (
                      <div className="bmhFishingGaugeMarker" style={{ left: `${clamp0to100(markerPct)}%` }} />
                    )}
                  </div>

                  <div className="bmhFishingHintRow">
                    <div className="bmhFishingHint" style={{ opacity: started ? 1 : 0.85 }}>
                      {hintText}
                    </div>

                    {isMyTurn ? (
                      <button
                        className="bmhFishingHitBtn"
                        style={{
                          opacity: canControl ? 1 : 0.55,
                          cursor: 'not-allowed',
                          transform: inWindow && canControl ? 'scale(1.05)' : 'scale(1)',
                          filter: inWindow && canControl ? 'drop-shadow(0 0 10px rgba(255,255,255,0.6))' : 'none',
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                        }}
                        disabled
                        title="Space로 HIT"
                      >
                        SPACE
                      </button>
                    ) : (
                      <div className="bmhFishingSpectatorPill">관전 중</div>
                    )}
                  </div>
                </div>
              )}

              {isLarge && (
                <div className="bmhFishingGaugeWrap">
                  <div className="bmhFishingBarsRow">
                    <div className="bmhFishingBarCol">
                      <div className="bmhFishingBarLabel">진행도</div>
                      <div className="bmhFishingBarTrack">
                        <div
                          className="bmhFishingBarFill bmhFishingBarFillProgress"
                          style={{ width: `${clamp0to100(displayProgress)}%` }}
                        />
                      </div>
                    </div>

                    <div className="bmhFishingBarCol">
                      <div className="bmhFishingBarLabel">장력</div>
                      <div className="bmhFishingBarTrack">
                        <div
                          className="bmhFishingBarFill bmhFishingBarFillTension"
                          style={{ width: `${clamp0to100(displayTension)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bmhFishingHintRow" style={{ marginTop: 10 }}>
                    <div className="bmhFishingHint" style={{ opacity: started ? 1 : 0.85 }}>
                      {hintText}
                    </div>

                    {isMyTurn ? (
                      <button
                        className="bmhFishingHitBtn"
                        style={{
                          opacity: canControl ? 1 : 0.55,
                          cursor: 'not-allowed',
                          transform: canControl ? 'scale(1.02)' : 'scale(1)',
                          filter: canControl ? 'drop-shadow(0 0 10px rgba(255,255,255,0.55))' : 'none',
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                        }}
                        disabled
                        title="Space로 펌프"
                      >
                        SPACE
                      </button>
                    ) : (
                      <div className="bmhFishingSpectatorPill">관전 중</div>
                    )}
                  </div>

                  {minPumpIntervalMs > 0 && isMyTurn && (
                    <div style={{ marginTop: 8, opacity: 0.75, fontSize: 12 }}>
                      너무 빠르면 패널티! (최소 간격: {minPumpIntervalMs}ms)
                    </div>
                  )}
                </div>
              )}
            </div>

            {result && (
              <div className="bmhFishingResultOverlay">
                <div className="bmhFishingResultCard">
                  <img
                    src={resultImageSrc}
                    alt={resultMsg?.success ? 'success' : 'fail'}
                    draggable={false}
                    style={{
                      width: '100%',
                      maxWidth: 420,
                      height: 'auto',
                      display: 'block',
                      margin: '0 auto 12px',
                      borderRadius: 14,
                    }}
                  />

                  <div className="bmhFishingResultTitle">{resultTitle}</div>
                  <div className="bmhFishingResultMsg">{resultText}</div>

                  {isMyTurn ? (
                    <button className="bmhFishingOkBtn" onClick={handleOkClick}>
                      확인
                    </button>
                  ) : (
                    <div className="bmhFishingSpectatorPill">턴 플레이어가 종료하면 자동으로 넘어가요</div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
