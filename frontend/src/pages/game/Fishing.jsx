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

  const isSpectator = !isMyTurn;

  // === 타이머/종료 안전장치 ===
  const onExitRef = useRef(onExit);
  useEffect(() => {
    onExitRef.current = onExit;
  }, [onExit]);

  const exitOnceRef = useRef(false);
  const startUnlockTimerRef = useRef(null);
  const resultAutoExitTimerRef = useRef(null);

  // ✅ 핵심: event-complete(onExit)는 "내 턴"만 호출
  const doExit = () => {
    // 관전자는 어떤 경우에도 event-complete를 보내지 않음
    if (!isMyTurn) return;

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
   * ✅ uiStep은 "화면 전환(연출)"에만 사용
   * - INTRO_1: 첫 화면(터치하면 INTRO_2)
   * - INTRO_2: 시작 화면(내 턴이면 터치/버튼으로 시작)
   * - INGAME: 실제 게임 UI (STARTED/UPDATE/RESULT는 이벤트 메시지로 제어)
   */
  const [uiStep, setUiStep] = useState("INTRO_1");

  // "시작" 중복 요청 방지(서버 STARTED 오기 전까지 잠금)
  const [startPending, setStartPending] = useState(false);
  const startRequestedRef = useRef(false);

  useEffect(() => {
    // 방이 바뀌면 인트로부터 다시
    setUiStep("INTRO_1");
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
    if (!isMyTurn) return; // ✅ 시작은 '내 턴'만
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
    // ✅ 관전자는 인트로 화면 터치/전환도 완전 차단
    if (isSpectator) return;

    // 이미 시작/결과 상태면 무시
    if (started || result) return;

    if (uiStep === "INTRO_1") {
      setUiStep("INTRO_2");
      return;
    }

    if (uiStep === "INTRO_2") {
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

  // ✅ 서버/클라 epoch 시간 오차 보정(serverTimeMs - clientNow)
  const [serverSkewMs, setServerSkewMs] = useState(0);
  const serverSkewRef = useRef(0);

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

  // ✅ serverTimeMs가 오면 skew를 부드럽게 갱신
  useEffect(() => {
    const st = Number(eventMessage?.serverTimeMs ?? 0);
    if (!st) return;

    const clientNow = Date.now();
    const measured = st - clientNow;

    // 네트워크 노이즈 완화(EMA)
    serverSkewRef.current =
        serverSkewRef.current === 0 ? measured : serverSkewRef.current * 0.9 + measured * 0.1;

    setServerSkewMs(serverSkewRef.current);
  }, [eventMessage?.serverTimeMs]);

  const syncedNowEpoch = nowEpoch + serverSkewMs; // ✅ 서버 epoch 기준으로 맞춘 현재 시각

  // 60fps 루프: started 상태에서만
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
      const activeLarge = ht === "FISH_LARGE";

      // ✅ LARGE 보간은 관전 포함해서도 부드럽게 보여야 함(조작만 막고, 표시만 보간)
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

  // eventMessage → started/update/result로 분기 저장
  useEffect(() => {
    if (!eventMessage?.type) return;

    if (eventMessage.type === "ROOM_EVENT_STARTED") {
      setStartedMsg(eventMessage);
      setUpdateMsg(null);
      setResultMsg(null);

      // ✅ 이벤트 시작되면 인트로 종료(관전 포함 모두 동일 UI)
      setUiStep("INGAME");

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
      setUiStep("INGAME");

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

      setUiStep("INGAME");

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

  // ✅ 결과 자동 종료는 "내 턴"만 (관전자는 서버 상태 바뀌면 자동으로 화면 내려감)
  useEffect(() => {
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

  // ✅ 서버시간 보정된 now 사용
  const elapsed = started ? syncedNowEpoch - startAt : 0;
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
    return stage === 2
        ? Number(p.secondWindowCenterPct ?? 0) || 0
        : Number(p.firstWindowCenterPct ?? 0) || 0;
  }, [started, startedMsg, isMedium, stage]);

  const windowWidthPct = useMemo(() => {
    if (!started) return 0;
    const p = startedMsg?.params ?? {};
    if (!isMedium) return Number(p.firstWindowWidthPct ?? 0) || 0;
    return stage === 2
        ? Number(p.secondWindowWidthPct ?? 0) || 0
        : Number(p.firstWindowWidthPct ?? 0) || 0;
  }, [started, startedMsg, isMedium, stage]);

  // 핑퐁 마커 %
  const pingPongMarkerPct = useMemo(() => {
    if (!usePingPongGauge) return 0;
    return computePingPongMarkerPct(startAt, syncedNowEpoch, gaugeCycleMs);
  }, [usePingPongGauge, startAt, syncedNowEpoch, gaugeCycleMs]);

  // 레거시(단방향) 계산도 남겨둠
  const biteDelay = useMemo(() => {
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
    if (!started) return 0;
    if (isSmall) return Number(startedMsg?.params?.firstSuccessDurationMs ?? 0);
    if (isMedium) {
      return stage === 2
          ? Number(startedMsg?.params?.secondSuccessDurationMs ?? 0)
          : Number(startedMsg?.params?.firstSuccessDurationMs ?? 0);
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

  // ✅ 조작은 내 턴 + 게임 유효 상태에서만
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

  // ✅ 서버 tick 없이 장력 "자연 감소"를 클라에서 계산(관전 포함)
  const tensionCooldownPerMs = useMemo(() => {
    const v = startedMsg?.params?.tensionCooldownPerMs ?? 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }, [startedMsg]);

  const lastServerTimeMs = useMemo(() => {
    // updateMsg에 serverTimeMs가 있으면 그걸 우선 사용, 없으면 startedMsg의 serverTimeMs
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

  // 보간 목표 갱신(관전도 부드럽게 보이게)
  useEffect(() => {
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

  // SMALL/MEDIUM HIT
  const onHit = () => {
    if (!canControl) return;
    publishAction("HIT");
  };

  // ===== LARGE: 홀드 금지 / 펌프 클릭만(실제 조작은 Space로만) =====
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
    doExit(); // ✅ 내 턴만 event-complete
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

  // ✅ "아무 입력 없을 때 Space"를 항상 노출되게 문구 정리
  const hintText = useMemo(() => {
    if (flashHint) return flashHint;

    if (!started) return "낚시 준비중…";
    if (isPendingStart) return "낚싯줄 던지는 중…";
    if (isExpired) return "시간 끝!";

    // 관전 문구도 Space 안내는 유지(조작은 막지만, '무슨 일이 벌어지는지' 안내)
    if (isSpectator) {
      if (isLarge) return largeReeling ? "펌프 중! (SPACE)" : "펌프 타이밍! (SPACE)";
      if (inWindow) return "지금 HIT 타이밍! (SPACE)";
      if (isMedium) return stage === 2 ? "2단계 타이밍! (SPACE)" : "1단계 기다렸다가 (SPACE)";
      return "타이밍 기다렸다가 (SPACE)";
    }

    // 내 턴(조작 가능)
    if (isLarge) return largeReeling ? "SPACE로 펌프!" : "SPACE를 눌러 펌프!";
    if (inWindow) return "지금 SPACE!";
    if (isMedium) return stage === 2 ? "2단계! 기다렸다가 SPACE!" : "1단계! 기다렸다가 SPACE!";
    return "타이밍 기다렸다가 SPACE!";
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
    if (isLarge) return "대형 (스페이스 펌프)";
    return "";
  }, [isSmall, isMedium, isLarge, stage]);

  // ✅ 표시용은 보간값(관전 포함)
  const displayProgress = isLarge ? smoothProgress : largeProgress;
  const displayTension = isLarge ? smoothTension : largeTension;

  // 인트로 화면 표시 여부(시작/결과 전까지만)
  const showIntro = !started && !result && (uiStep === "INTRO_1" || uiStep === "INTRO_2");
  const introBg = uiStep === "INTRO_1" ? INTRO_IMAGE_1 : INTRO_IMAGE_2;

  // ✅ Space 키 입력: "게임 진행 중"에만 동작(인트로에서는 무시)
  const keyHandlerRef = useRef(null);
  useEffect(() => {
    keyHandlerRef.current = (e) => {
      if (e.code !== "Space") return;
      if (e.repeat) return;
      e.preventDefault();

      // ✅ 인트로에서는 Space로 화면 넘기지 않음(요구사항)
      if (showIntro) return;
      if (result) return;

      // ✅ 조작은 내 턴만
      if (!canControl) return;

      if (isLarge) pumpOnce();
      else onHit();
    };
  }, [showIntro, result, canControl, isLarge, onHit]);

  useEffect(() => {
    const onKeyDown = (e) => keyHandlerRef.current?.(e);
    window.addEventListener("keydown", onKeyDown, { passive: false });
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const resultImageSrc = useMemo(() => {
    if (!result) return "";
    return resultMsg?.success ? RESULT_SUCCESS_IMAGE : RESULT_FAIL_IMAGE;
  }, [result, resultMsg]);

  return (
      <div className="bmhFishingOverlay">
        <div className="bmhFishingStage">
          {/* ✅ 관전 입력 완전 차단 레이어(인트로 포함) */}
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

          {/* 인트로(클릭 2번) */}
          {showIntro && (
              <div
                  style={{ position: "absolute", inset: 0 }}
                  onClick={handleIntroTap}
                  onTouchStart={(e) => {
                    // 모바일도 “터치”로 클릭 동작하게
                    e.preventDefault();
                    handleIntroTap();
                  }}
              >
                <div className="bmhFishingBg" style={{ backgroundImage: `url(${introBg})` }} />

                {/* ✅ 안내 멘트 */}
                <div className="bmhFishingTapHint">화면을 터치해주세요</div>

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
                {uiStep === "INTRO_2" && (
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
                      <img
                          src="/images/fishing/splash.webp"
                          alt="splash"
                          className="bmhFishingSplash"
                          draggable={false}
                      />
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
                                    width: `${Math.max(
                                        0,
                                        clamp0to100(winEndPct) - clamp0to100(winStartPct),
                                    )}%`,
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

                          {/* ✅ 조작은 Space: 버튼은 안내용으로만 */}
                          {isMyTurn ? (
                              <button
                                  className="bmhFishingHitBtn"
                                  style={{
                                    opacity: canControl ? 1 : 0.55,
                                    cursor: "not-allowed",
                                    transform: inWindow && canControl ? "scale(1.05)" : "scale(1)",
                                    filter:
                                        inWindow && canControl
                                            ? "drop-shadow(0 0 10px rgba(255,255,255,0.6))"
                                            : "none",
                                  }}
                                  onClick={(e) => {
                                    e.preventDefault();
                                  }}
                                  disabled
                                  title="Space로 HIT!"
                              >
                                SPACE
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

                          {/* ✅ 조작은 Space: 버튼은 안내용 */}
                          {isMyTurn ? (
                              <button
                                  className="bmhFishingHitBtn"
                                  style={{
                                    opacity: canControl ? 1 : 0.55,
                                    cursor: "not-allowed",
                                    transform: canControl ? "scale(1.02)" : "scale(1)",
                                    filter: canControl ? "drop-shadow(0 0 10px rgba(255,255,255,0.55))" : "none",
                                  }}
                                  onClick={(e) => {
                                    e.preventDefault();
                                  }}
                                  disabled
                                  title="Space로 펌프!"
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
