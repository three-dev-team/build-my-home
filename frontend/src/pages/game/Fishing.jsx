import { useEffect, useMemo, useRef, useState } from "react";
import { useGameTimer } from "../../hooks/useGameTimer.js";
import "./css/Fishing.css";

const INTRO_IMAGE_1 = "/images/fishing/justin_intro.webp"; // 1번째 화면(터치해서 다음)
const INTRO_IMAGE_2 = "/images/fishing/justin_start.webp"; // 2번째 화면(터치/시작하기로 시작)

// 결과 이미지
const RESULT_SUCCESS_IMAGE = "/images/fishing/success_fishing.webp";
const RESULT_FAIL_IMAGE = "/images/fishing/fail_fishing.webp";

const clamp0to100 = (v) => Math.max(0, Math.min(100, v));

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
                                  isMyTurn: rawIsMyTurn, // ✅DEV : isMyTurn,
                                  currentPlayerName,
                                  timeoutSeconds = 0,
                                  eventMessage,
                                  onExit,
                                  onStartFishing,
                                  onFishingAction,
                                }) {
  // ✅DEV ONLY: 내 턴이 아니어도 UI 테스트 가능하게 강제(콘솔에서 sessionStorage로 토글)
  // 켜기: sessionStorage.setItem("DEV_FORCE_MY_TURN","1"); location.reload();
  // 끄기: sessionStorage.removeItem("DEV_FORCE_MY_TURN"); location.reload();
  const isMyTurn =
      rawIsMyTurn ||
      (import.meta.env.DEV && sessionStorage.getItem("DEV_FORCE_MY_TURN") === "1");

  // 공통 타이머 UI
  const { timeLeft, isUrgent, hasTimeOutPanel } = useGameTimer(timeoutSeconds);

  // === 타이머/종료 안전장치 ===
  const onExitRef = useRef(onExit);
  useEffect(() => {
    onExitRef.current = onExit;
  }, [onExit]);

  const exitOnceRef = useRef(false);
  const startUnlockTimerRef = useRef(null);
  const resultAutoExitTimerRef = useRef(null);

  const doExit = () => {
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

  /**
   * 인트로 흐름(터치 2번)
   * - 1: 첫 화면(터치하면 2로)
   * - 2: 시작 화면(내 턴이면 터치/버튼으로 시작)
   * - 0: 실제 게임 UI
   */
  const [introStep, setIntroStep] = useState(1);

  // "시작" 중복 요청 방지(서버 STARTED 오기 전까지 잠금)
  const [startPending, setStartPending] = useState(false);
  const startRequestedRef = useRef(false);

  useEffect(() => {
    setIntroStep(1);
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

  // 언마운트 시 타임아웃 정리
  useEffect(() => {
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
    if (!isMyTurn) return;
    if (!roomId) return;
    if (startPending) return;
    if (!onStartFishing) return;

    if (startRequestedRef.current) return;
    startRequestedRef.current = true;

    setStartPending(true);

    onStartFishing();

    // 서버 STARTED가 안 오면 3초 뒤 잠금 해제
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
    if (started || result) return;

    if (introStep === 1) {
      setIntroStep(2);
      return;
    }

    if (introStep === 2) {
      requestStart();
    }
  };

  /**
   * 시간 기준(애니메이션/진행도 계산용)
   * - 서버 startAt(eventStartTimeMs)은 epoch(ms) 기준
   * - rAF는 performance.now() 기준 → offset으로 epoch로 환산
   */
  const [nowPerf, setNowPerf] = useState(() => performance.now());
  const [epochOffsetMs] = useState(() => Date.now() - performance.now());
  const nowEpoch = useMemo(() => nowPerf + epochOffsetMs, [nowPerf, epochOffsetMs]);

  // STARTED/UPDATE/RESULT 분리 저장
  const [startedMsg, setStartedMsg] = useState(null);
  const [updateMsg, setUpdateMsg] = useState(null);
  const [resultMsg, setResultMsg] = useState(null);

  // LARGE(대형) 보간(smoothing)
  const [smoothProgress, setSmoothProgress] = useState(0);
  const [smoothTension, setSmoothTension] = useState(0);

  const smoothProgressRef = useRef(0);
  const smoothTensionRef = useRef(0);
  const targetProgressRef = useRef(0);
  const targetTensionRef = useRef(0);
  const lastPerfRef = useRef(null);

  const rafRef = useRef(0);

  // 60fps 루프: started 상태에서만 돌리고, LARGE 보간은 "내 턴"일 때만 수행
  useEffect(() => {
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
      const activeLarge = isMyTurn && ht === "FISH_LARGE";

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
  }, [startedMsg, resultMsg, isMyTurn]);

  // eventMessage → started/update/result로 분기 저장
  useEffect(() => {
    if (!eventMessage?.type) return;

    if (eventMessage.type === "ROOM_EVENT_STARTED") {
      setStartedMsg(eventMessage);
      setUpdateMsg(null);
      setResultMsg(null);

      setIntroStep(0);

      setStartPending(false);
      startRequestedRef.current = false;
      if (startUnlockTimerRef.current) {
        clearTimeout(startUnlockTimerRef.current);
        startUnlockTimerRef.current = null;
      }

      // 보간 초기화
      smoothProgressRef.current = 0;
      smoothTensionRef.current = 0;
      setSmoothProgress(0);
      setSmoothTension(0);

      return;
    }

    if (eventMessage.type === "ROOM_EVENT_UPDATE") {
      setUpdateMsg((prev) => ({ ...(prev ?? {}), ...(eventMessage ?? {}) }));
      return;
    }

    if (eventMessage.type === "ROOM_EVENT_RESULT") {
      setResultMsg(eventMessage);
      setIntroStep(0);
      setStartPending(false);
      startRequestedRef.current = false;
      if (startUnlockTimerRef.current) {
        clearTimeout(startUnlockTimerRef.current);
        startUnlockTimerRef.current = null;
      }
      return;
    }

    if (eventMessage.type === "ERROR") {
      setResultMsg({
        type: "ROOM_EVENT_RESULT",
        eventType: "FISHING",
        success: false,
        message: eventMessage?.message ?? "낚시 진행 중 오류가 발생했어요.",
        gainedQty: 0,
        price: 0,
      });
      setIntroStep(0);
      setStartPending(false);
      startRequestedRef.current = false;
      if (startUnlockTimerRef.current) {
        clearTimeout(startUnlockTimerRef.current);
        startUnlockTimerRef.current = null;
      }
    }
  }, [eventMessage]);

  const started = !!startedMsg;
  const result = !!resultMsg;

  // 결과 화면은 3초 뒤 자동 종료(성공/실패 공통)
  useEffect(() => {
    if (!result) return;

    if (resultAutoExitTimerRef.current) {
      clearTimeout(resultAutoExitTimerRef.current);
      resultAutoExitTimerRef.current = null;
    }

    resultAutoExitTimerRef.current = setTimeout(() => {
      doExit();
    }, 3000);

    return () => {
      if (resultAutoExitTimerRef.current) {
        clearTimeout(resultAutoExitTimerRef.current);
        resultAutoExitTimerRef.current = null;
      }
    };
  }, [result, resultMsg]);

  const isSpectator = !isMyTurn;

  // harvestType: FISH_SMALL | FISH_MEDIUM | FISH_LARGE
  const harvestType = useMemo(() => {
    const ht = startedMsg?.harvestType ?? startedMsg?.params?.harvestType;
    return typeof ht === "string" ? ht : "";
  }, [startedMsg]);

  const isSmall = harvestType === "FISH_SMALL";
  const isMedium = harvestType === "FISH_MEDIUM";
  const isLarge = harvestType === "FISH_LARGE";

  // STARTED 정보 기반 진행 시간 계산(전체 제한 시간 표시용)
  const startAt = started ? Number(startedMsg?.eventStartTimeMs ?? 0) : 0;
  const durationMs = started ? Number(startedMsg?.durationMs ?? 0) : 0;

  const elapsed = started ? nowEpoch - startAt : 0;
  const clampedElapsed = started && durationMs > 0 ? Math.max(0, Math.min(durationMs, elapsed)) : 0;

  const isPendingStart = started && elapsed < 0;
  const isExpired = started && durationMs > 0 && elapsed > durationMs;

  // SMALL/MEDIUM: stage
  const stage = useMemo(() => {
    const st = updateMsg?.stage ?? startedMsg?.params?.stage ?? 1;
    return Number(st || 1);
  }, [updateMsg, startedMsg]);

  // ===== 핑퐁 게이지 파라미터(STARTED params 기반) =====
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

  // 핑퐁 마커 %
  const pingPongMarkerPct = useMemo(() => {
    if (!usePingPongGauge) return 0;
    return computePingPongMarkerPct(startAt, nowEpoch, gaugeCycleMs);
  }, [usePingPongGauge, startAt, nowEpoch, gaugeCycleMs]);

  // 레거시(단방향) 계산도 남겨둠
  const biteDelay = useMemo(() => {
    if (!started) return 0;
    if (isSmall) return Number(startedMsg?.params?.firstBiteDelayMs ?? 0);
    if (isMedium) {
      return stage === 2 ? Number(startedMsg?.params?.secondBiteDelayMs ?? 0) : Number(startedMsg?.params?.firstBiteDelayMs ?? 0);
    }
    return 0;
  }, [started, startedMsg, isSmall, isMedium, stage]);

  const successDuration = useMemo(() => {
    if (!started) return 0;
    if (isSmall) return Number(startedMsg?.params?.firstSuccessDurationMs ?? 0);
    if (isMedium) {
      return stage === 2 ? Number(startedMsg?.params?.secondSuccessDurationMs ?? 0) : Number(startedMsg?.params?.firstSuccessDurationMs ?? 0);
    }
    return 0;
  }, [started, startedMsg, isSmall, isMedium, stage]);

  // gauge marker %
  const markerPct = useMemo(() => {
    if (!started) return 0;
    if (usePingPongGauge) return pingPongMarkerPct;
    return durationMs > 0 ? (clampedElapsed / durationMs) * 100 : 0;
  }, [started, usePingPongGauge, pingPongMarkerPct, durationMs, clampedElapsed]);

  // window start/end %
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

  const canControl = isMyTurn && started && !isPendingStart && !isExpired && !result;

  // LARGE: progress/tension/reeling
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

  // 보간 목표 갱신
  useEffect(() => {
    targetProgressRef.current = clamp0to100(largeProgress);
    targetTensionRef.current = clamp0to100(largeTension);

    if (!isMyTurn) return;

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
  }, [isLarge, started, result, largeProgress, largeTension, isMyTurn]);

  const publishAction = (action) => {
    if (!onFishingAction) return;
    if (!roomId) return;
    onFishingAction(action);
  };

  // SMALL/MEDIUM HIT
  const onHit = () => {
    if (!canControl) return;
    publishAction("HIT");
  };

  // ===== LARGE: 홀드 금지 / 펌프 클릭만 =====
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

    // 클라에서도 최소 간격 잠금(서버 패널티와 체감 맞추기)
    const now = Date.now();
    if (minPumpIntervalMs > 0 && now - lastPumpClientEpochRef.current < minPumpIntervalMs) {
      return;
    }
    if (pumpPendingRef.current) return;

    pumpPendingRef.current = true;
    lastPumpClientEpochRef.current = now;

    publishAction("REEL_START");

    // 짧은 시간 뒤 자동 STOP (홀드로 이득 못 보게)
    if (pumpTimerRef.current) clearTimeout(pumpTimerRef.current);
    pumpTimerRef.current = setTimeout(() => {
      publishAction("REEL_STOP");
      pumpPendingRef.current = false;
      pumpTimerRef.current = null;
    }, 120);
  };

  const handleOkClick = () => {
    doExit();
  };

  const resultTitle = result ? (resultMsg?.success ? "성공!" : "실패") : "";
  const resultText = result ? resultMsg?.message : "";

  // SMALL/MEDIUM: 서버가 준 UPDATE message(미스/2단계 등)를 잠깐 힌트로 보여주기
  const [flashHint, setFlashHint] = useState("");
  useEffect(() => {
    const msg = updateMsg?.message;
    if (!msg) return;

    // LARGE는 버튼 상태 텍스트가 더 중요해서 flash는 SMALL/MEDIUM만
    if (isLarge) return;

    setFlashHint(String(msg));
    const t = setTimeout(() => setFlashHint(""), 450);
    return () => clearTimeout(t);
  }, [updateMsg?.message, isLarge]);

  const hintText = useMemo(() => {
    if (flashHint) return flashHint;

    if (!started) return "낚시 준비중…";
    if (isPendingStart) return "낚싯줄 던지는 중…";
    if (isExpired) return "시간 끝!";

    if (isSpectator) {
      if (isLarge) return largeReeling ? "펌프 중…" : "타이밍 보는 중…";
      if (inWindow) return "타이밍 구간!";
      if (isMedium) return stage === 2 ? "2단계 진행 중…" : "1단계 진행 중…";
      return "대기 중…";
    }

    if (isLarge) return largeReeling ? "펌프 중!" : "펌프 버튼을 눌러!";
    if (inWindow) return "지금 HIT!";
    if (isMedium) return stage === 2 ? "2단계 타이밍!" : "1단계 타이밍 기다려봐";
    return "타이밍을 기다려봐";
  }, [
    flashHint,
    started,
    isPendingStart,
    isExpired,
    isSpectator,
    isLarge,
    largeReeling,
    inWindow,
    isMedium,
    stage,
  ]);

  const titleRight = useMemo(() => {
    if (isSmall) return "소형";
    if (isMedium) return `중형 (단계 ${stage}/2)`;
    if (isLarge) return "대형 (펌프)";
    return "";
  }, [isSmall, isMedium, isLarge, stage]);

  const displayProgress = isMyTurn ? smoothProgress : largeProgress;
  const displayTension = isMyTurn ? smoothTension : largeTension;

  // 인트로 화면 표시 여부(시작/결과 전까지만)
  const showIntro = !started && !result && (introStep === 1 || introStep === 2);
  const introBg = introStep === 1 ? INTRO_IMAGE_1 : INTRO_IMAGE_2;

  const resultImageSrc = useMemo(() => {
    if (!result) return "";
    return resultMsg?.success ? RESULT_SUCCESS_IMAGE : RESULT_FAIL_IMAGE;
  }, [result, resultMsg]);

  return (
      <div className="bmhFishingOverlay">
        <div className="bmhFishingStage">
          {/* 인트로(터치 2번) */}
          {showIntro && (
              <div
                  style={{ position: "absolute", inset: 0 }}
                  onClick={handleIntroTap}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    handleIntroTap();
                  }}
              >
                <div className="bmhFishingBg" style={{ backgroundImage: `url(${introBg})` }} />

                {hasTimeOutPanel && (
                    <div className="bmhFishingTimerWrap">
                      <div className="bmhFishingTimerPill">
                        <span className="bmhFishingTimerLabel">TIME</span>
                        <span className={`bmhFishingTimerValue ${isUrgent ? "bmhFishingTimerUrgent" : ""}`}>
                    {timeLeft}s
                  </span>
                      </div>
                    </div>
                )}

                {/* 2번째 화면: 버튼도 제공(터치해도 시작됨) */}
                {introStep === 2 && (
                    <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          alignItems: "flex-end",
                          justifyContent: "flex-end",
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
                                cursor: startPending ? "not-allowed" : "pointer",
                                padding: "12px 18px",
                                borderRadius: 16,
                                fontSize: 16,
                              }}
                          >
                            {startPending ? "시작 중..." : "시작하기"}
                          </button>
                      ) : (
                          <div className="bmhFishingSpectatorPill">
                            {currentPlayerName ? `${currentPlayerName}님 시작 대기 중` : "시작 대기 중"}
                          </div>
                      )}
                    </div>
                )}
              </div>
          )}

          {/* 실제 낚시 UI */}
          {!showIntro && (
              <>
                <div className="bmhFishingBg" style={{ backgroundImage: "url(/images/fishing/bg.webp)" }} />

                {hasTimeOutPanel && !result && (
                    <div className="bmhFishingTimerWrap">
                      <div className="bmhFishingTimerPill">
                        <span className="bmhFishingTimerLabel">TIME</span>
                        <span className={`bmhFishingTimerValue ${isUrgent ? "bmhFishingTimerUrgent" : ""}`}>
                    {timeLeft}s
                  </span>
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
                      style={{ animationDuration: !isLarge && inWindow ? "0.55s" : "1.1s" }}
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
                      {currentPlayerName ? `${currentPlayerName} 차례` : ""}
                      {titleRight ? ` · ${titleRight}` : ""}
                      {!isMyTurn ? " · 관전 중" : ""}
                    </div>
                  </div>

                  {/* SMALL/MEDIUM */}
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
                                    cursor: canControl ? "pointer" : "not-allowed",
                                    transform: inWindow && canControl ? "scale(1.05)" : "scale(1)",
                                    filter:
                                        inWindow && canControl
                                            ? "drop-shadow(0 0 10px rgba(255,255,255,0.6))"
                                            : "none",
                                  }}
                                  onClick={onHit}
                                  disabled={!canControl}
                              >
                                HIT
                              </button>
                          ) : (
                              <div className="bmhFishingSpectatorPill">관전 중</div>
                          )}
                        </div>
                      </div>
                  )}

                  {/* LARGE */}
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
                                    cursor: canControl ? "pointer" : "not-allowed",
                                    transform: canControl ? "scale(1.02)" : "scale(1)",
                                    filter: canControl ? "drop-shadow(0 0 10px rgba(255,255,255,0.55))" : "none",
                                  }}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    pumpOnce();
                                  }}
                                  onTouchStart={(e) => {
                                    e.preventDefault();
                                    pumpOnce();
                                  }}
                                  disabled={!canControl}
                              >
                                펌프!
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
                            alt={resultMsg?.success ? "success" : "fail"}
                            draggable={false}
                            style={{
                              width: "100%",
                              maxWidth: 420,
                              height: "auto",
                              display: "block",
                              margin: "0 auto 12px",
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
                            <div className="bmhFishingSpectatorPill">3초 뒤 자동 종료</div>
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
