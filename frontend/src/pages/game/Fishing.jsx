import { useEffect, useMemo, useRef, useState } from "react";
import { useGameTimer } from "../../hooks/useGameTimer.js";
import "./css/Fishing.css";

export default function Fishing({
                                    roomId,
                                    stompClient,
                                    isMyTurn,
                                    currentPlayerName,
                                    timeoutSeconds = 0,
                                    eventMessage,
                                    onExit,
                                }) {
    // --- 공통 타이머 UI (Loan/Stamp/KK와 동일한 훅 사용) ---
    const { timeLeft, isUrgent, hasTimeOutPanel } = useGameTimer(timeoutSeconds);

    // =========================
    // 1) 시간 기준(부드러운 애니메이션용)
    // =========================
    // nowPerf: requestAnimationFrame에서 들어오는 performance time (ms)
    const [nowPerf, setNowPerf] = useState(0);

    // epochOffsetMs: epoch(ms) - perf(ms)
    // 렌더 중 Date.now()/performance.now() 호출을 피하기 위해 마운트 후 1회만 계산한다.
    const [epochOffsetMs, setEpochOffsetMs] = useState(0);
    const [epochReady, setEpochReady] = useState(false);

    useEffect(() => {
        // 마운트 후 1회만 계산 (ESLint purity 룰 대응)
        const perf = performance.now();
        const offset = Date.now() - perf; // epoch = perf + offset
        setEpochOffsetMs(offset);
        setEpochReady(true);
    }, []);

    // nowEpoch: 현재 epoch(ms). epochReady 전엔 0으로 안전 처리.
    const nowEpoch = useMemo(() => {
        if (!epochReady) return 0;
        return nowPerf + epochOffsetMs;
    }, [nowPerf, epochOffsetMs, epochReady]);

    // =========================
    // 2) start 1회 가드(내 턴에서만)
    // =========================
    const startRequestedRef = useRef(false);

    // =========================
    // 3) 메시지 분리 저장 (STARTED/UPDATE/RESULT)
    // =========================
    const [startedMsg, setStartedMsg] = useState(null);
    const [updateMsg, setUpdateMsg] = useState(null);
    const [resultMsg, setResultMsg] = useState(null);

    // =========================
    // 4) LARGE(대형) 보간(smoothing)
    // =========================
    const [smoothProgress, setSmoothProgress] = useState(0);
    const [smoothTension, setSmoothTension] = useState(0);

    // 보간 계산은 render가 아니라 rAF/effect에서만 하기 위해 ref 사용
    const smoothProgressRef = useRef(0);
    const smoothTensionRef = useRef(0);
    const targetProgressRef = useRef(0);
    const targetTensionRef = useRef(0);
    const lastPerfRef = useRef(null);

    // rAF 루프에서 최신 플래그를 읽기 위한 ref
    const isLargeRef = useRef(false);
    const startedRef = useRef(false);
    const resultRef = useRef(false);

    // =========================
    // 5) 60fps 루프: nowPerf 갱신 + LARGE 보간
    // =========================
    useEffect(() => {
        let raf = 0;

        const loop = (t) => {
            // nowPerf는 “게이지/타이밍”과 “보간”을 위해 필요 (Fishing 화면에서만 60fps)
            setNowPerf(t);

            const activeLarge =
                isLargeRef.current && startedRef.current && !resultRef.current;

            if (activeLarge) {
                const last = lastPerfRef.current ?? t;
                const dt = Math.max(0, t - last);
                lastPerfRef.current = t;

                // tauMs: 값이 작을수록 빠르게 따라가고, 클수록 더 부드럽게(느리게) 따라감
                // 너무 과한 모션 대신 "게임 UI스럽게"만 부드럽게 보정
                const tauMs = 90;
                const alpha = 1 - Math.exp(-dt / tauMs);

                const tp = targetProgressRef.current;
                const tt = targetTensionRef.current;

                const nextP =
                    smoothProgressRef.current + (tp - smoothProgressRef.current) * alpha;
                const nextT =
                    smoothTensionRef.current + (tt - smoothTensionRef.current) * alpha;

                smoothProgressRef.current = nextP;
                smoothTensionRef.current = nextT;

                setSmoothProgress(nextP);
                setSmoothTension(nextT);
            } else {
                lastPerfRef.current = t;
            }

            raf = requestAnimationFrame(loop);
        };

        raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
    }, []);

    // =========================
    // 6) eventMessage → started/update/result로 분기 저장
    // =========================
    useEffect(() => {
        if (!eventMessage?.type) return;

        if (eventMessage.type === "ROOM_EVENT_STARTED") {
            setStartedMsg(eventMessage);
            setUpdateMsg(null);
            setResultMsg(null);

            // 새 게임 시작 시, 보간 값도 초기화(튀는 느낌 방지)
            smoothProgressRef.current = 0;
            smoothTensionRef.current = 0;
            setSmoothProgress(0);
            setSmoothTension(0);

            // 혹시 재진입 케이스 대비
            startRequestedRef.current = false;
            return;
        }

        if (eventMessage.type === "ROOM_EVENT_UPDATE") {
            // UPDATE는 일부 필드만 올 수 있어서 merge
            setUpdateMsg((prev) => ({ ...(prev ?? {}), ...(eventMessage ?? {}) }));
            return;
        }

        if (eventMessage.type === "ROOM_EVENT_RESULT") {
            setResultMsg(eventMessage);
            return;
        }

        if (eventMessage.type === "ERROR") {
            // 낚시 도중 서버 에러가 왔을 때도 “결과 모달”로 동일 처리
            setResultMsg({
                type: "ROOM_EVENT_RESULT",
                eventType: "FISHING",
                success: false,
                message: eventMessage?.message ?? "낚시 진행 중 오류가 발생했어요.",
                gainedQty: 0,
                price: 0,
            });
        }
    }, [eventMessage]);

    const started = !!startedMsg;
    const result = !!resultMsg;

    // harvestType: FISH_SMALL | FISH_MEDIUM | FISH_LARGE
    const harvestType = useMemo(() => {
        const ht = startedMsg?.harvestType ?? startedMsg?.params?.harvestType;
        return typeof ht === "string" ? ht : "";
    }, [startedMsg]);

    const isSmall = harvestType === "FISH_SMALL";
    const isMedium = harvestType === "FISH_MEDIUM";
    const isLarge = harvestType === "FISH_LARGE";

    // 관전자(read-only)
    const isSpectator = !isMyTurn;

    // rAF loop에서 쓸 최신 플래그 갱신
    useEffect(() => {
        isLargeRef.current = isLarge;
        startedRef.current = started;
        resultRef.current = result;
    }, [isLarge, started, result]);

    // =========================
    // 7) STARTED 정보 기반 진행 시간 계산
    // =========================
    const startAt = started ? Number(startedMsg?.eventStartTimeMs ?? 0) : 0;
    const durationMs = started ? Number(startedMsg?.durationMs ?? 0) : 0;

    const elapsed = started ? nowEpoch - startAt : 0;
    const clampedElapsed =
        started && durationMs > 0 ? Math.max(0, Math.min(durationMs, elapsed)) : 0;

    const isPendingStart = started && elapsed < 0; // startAt이 미래면 "던지는 중" 상태
    const isExpired = started && durationMs > 0 && elapsed > durationMs;

    // =========================
    // 8) WAITING_FISHING 진입 시(마운트) 내 턴이면 자동 start 1회
    // =========================
    useEffect(() => {
        if (!isMyTurn) return;
        if (!stompClient) return;
        if (!roomId) return;
        if (!epochReady) return; // 시간 기준 준비 후 시작(안전)
        if (started || result) return;
        if (startRequestedRef.current) return;

        startRequestedRef.current = true;
        stompClient.publish({
            destination: "/app/fishing/start",
            body: JSON.stringify({ roomId: Number(roomId) }),
        });
    }, [isMyTurn, stompClient, roomId, started, result, epochReady]);

    // =========================
    // 9) SMALL/MEDIUM: 타이밍 게이지 계산
    // =========================
    const stage = useMemo(() => {
        const st = updateMsg?.stage ?? startedMsg?.params?.stage ?? 1;
        return Number(st || 1);
    }, [updateMsg, startedMsg]);

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

    const markerPct =
        started && durationMs > 0 ? (clampedElapsed / durationMs) * 100 : 0;

    const winStartPct =
        started && durationMs > 0 ? (biteDelay / durationMs) * 100 : 0;

    const winEndPct =
        started && durationMs > 0
            ? ((biteDelay + successDuration) / durationMs) * 100
            : 0;

    const inWindow = started
        ? clampedElapsed >= biteDelay &&
        clampedElapsed <= biteDelay + successDuration
        : false;

    const canControl =
        isMyTurn && started && !isPendingStart && !isExpired && !result;

    // =========================
    // 10) LARGE: progress/tension/reeling
    // =========================
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

    const clamp01to100 = (v) => Math.max(0, Math.min(100, v));

    // 서버값 → targetRef로 넣어두고, rAF에서 smooth하게 따라가게 함
    useEffect(() => {
        targetProgressRef.current = clamp01to100(largeProgress);
        targetTensionRef.current = clamp01to100(largeTension);

        // 시작 직후 튐 방지: 첫 세팅은 스냅(너무 느리게 따라가는 느낌 방지)
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
    }, [isLarge, started, result, largeProgress, largeTension]);

    // =========================
    // 11) 서버 액션 전송 (STOMP 필요)
    // =========================
    // ✅ STOMP를 안 쓰면:
    // - start 요청(/app/fishing/start) 자체를 보낼 수 없음
    // - HIT/REEL_* 액션도 보낼 수 없어서 “진짜 게임 진행”이 막힘
    const publishAction = (action) => {
        if (!stompClient) return;
        if (!roomId) return;
        stompClient.publish({
            destination: "/app/fishing/action",
            body: JSON.stringify({ roomId: Number(roomId), action }),
        });
    };

    const onHit = () => {
        if (!canControl) return;
        publishAction("HIT");
    };

    const onReelStart = () => {
        if (!canControl) return;
        publishAction("REEL_START");
    };

    const onReelStop = () => {
        if (!canControl) return;
        publishAction("REEL_STOP");
    };

    // 결과 모달 확인 버튼
    const handleOkClick = () => {
        // 내 턴이면 서버에 event-complete까지 보내서 턴 진행
        if (isMyTurn) {
            if (onExit) onExit();
            return;
        }
        // 관전자는 read-only: 모달만 닫고 턴 진행은 “내 턴 플레이어”가 처리
        setResultMsg(null);
    };

    // 결과 텍스트
    const resultTitle = result ? (resultMsg?.success ? "성공!" : "실패") : "";
    const resultText = result ? resultMsg?.message : "";

    // 힌트 텍스트(관전은 상황 안내 중심)
    const hintText = useMemo(() => {
        if (!started) return "낚시 준비중…";
        if (isPendingStart) return "낚싯줄 던지는 중…";
        if (isExpired) return "시간 끝!";

        if (isSpectator) {
            if (isLarge) return largeReeling ? "릴 감는 중…" : "긴장감이 올라가는 중…";
            if (inWindow) return "타이밍 구간!";
            if (isMedium) return stage === 2 ? "2단계 진행 중…" : "1단계 진행 중…";
            return "대기 중…";
        }

        // 내 턴(조작자)
        if (isLarge) return largeReeling ? "릴 감는 중!" : "릴을 감아봐!";
        if (inWindow) return "지금 HIT!";
        if (isMedium) return stage === 2 ? "2단계 타이밍!" : "1단계 타이밍 기다려봐";
        return "타이밍을 기다려봐";
    }, [
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
        if (isLarge) return "대형 (릴링)";
        return "";
    }, [isSmall, isMedium, isLarge, stage]);

    // LARGE에서 내 턴은 보간 값, 관전은 서버값 그대로(관전은 read-only로 깔끔)
    const displayProgress = isMyTurn ? smoothProgress : largeProgress;
    const displayTension = isMyTurn ? smoothTension : largeTension;

    // =========================
    // 12) 렌더
    // =========================
    return (
        <div className="bmhFishingOverlay">
            <div className="bmhFishingStage">
                {/* 배경 */}
                <div
                    className="bmhFishingBg"
                    style={{ backgroundImage: "url(/images/fishing/bg.webp)" }}
                />

                {/* 타이머(다른 이벤트 페이지와 통일) */}
                {hasTimeOutPanel && !result && (
                    <div className="bmhFishingTimerWrap">
                        <div className="bmhFishingTimerPill">
                            <span className="bmhFishingTimerLabel">TIME</span>
                            <span
                                className={`bmhFishingTimerValue ${
                                    isUrgent ? "bmhFishingTimerUrgent" : ""
                                }`}
                            >
                {timeLeft}s
              </span>
                        </div>
                    </div>
                )}

                {/* 캐릭터 */}
                <img
                    src="/images/fishing/character.webp"
                    alt="character"
                    className="bmhFishingCharacter"
                    draggable={false}
                />

                {/* 찌 + 물결 */}
                <div className="bmhFishingBobberWrap">
                    <img
                        src="/images/fishing/bobber.webp"
                        alt="bobber"
                        className="bmhFishingBobber"
                        style={{
                            animationDuration: !isLarge && inWindow ? "0.55s" : "1.1s",
                        }}
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

                {/* HUD */}
                <div className="bmhFishingHud">
                    <div className="bmhFishingTitleRow">
                        <div className="bmhFishingTitleText">낚시</div>
                        <div className="bmhFishingSubText">
                            {currentPlayerName ? `${currentPlayerName} 차례` : ""}
                            {titleRight ? ` · ${titleRight}` : ""}
                            {isSpectator ? " · 관전 중" : ""}
                        </div>
                    </div>

                    {/* SMALL/MEDIUM: 타이밍 게이지 */}
                    {!isLarge && (
                        <div className="bmhFishingGaugeWrap">
                            <div className="bmhFishingGaugeTrack">
                                {/* 성공 구간 */}
                                {started && (
                                    <div
                                        className="bmhFishingGaugeWindow"
                                        style={{
                                            left: `${Math.max(0, Math.min(100, winStartPct))}%`,
                                            width: `${Math.max(
                                                0,
                                                Math.min(100, winEndPct) - Math.min(100, winStartPct),
                                            )}%`,
                                            opacity: isPendingStart ? 0.2 : 0.85,
                                        }}
                                    />
                                )}

                                {/* 마커 */}
                                {started && (
                                    <div
                                        className="bmhFishingGaugeMarker"
                                        style={{
                                            left: `${Math.max(0, Math.min(100, markerPct))}%`,
                                        }}
                                    />
                                )}
                            </div>

                            <div className="bmhFishingHintRow">
                                <div
                                    className="bmhFishingHint"
                                    style={{ opacity: started ? 1 : 0.85 }}
                                >
                                    {hintText}
                                </div>

                                {/* 조작 버튼(내 턴만) / 관전은 pill */}
                                {isMyTurn ? (
                                    <button
                                        className="bmhFishingHitBtn"
                                        style={{
                                            opacity: canControl ? 1 : 0.55,
                                            cursor: canControl ? "pointer" : "not-allowed",
                                            transform:
                                                inWindow && canControl ? "scale(1.05)" : "scale(1)",
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

                    {/* LARGE: 릴링 UI */}
                    {isLarge && (
                        <div className="bmhFishingGaugeWrap">
                            <div className="bmhFishingBarsRow">
                                <div className="bmhFishingBarCol">
                                    <div className="bmhFishingBarLabel">진행도</div>
                                    <div className="bmhFishingBarTrack">
                                        <div
                                            className="bmhFishingBarFill bmhFishingBarFillProgress"
                                            style={{
                                                width: `${clamp01to100(displayProgress)}%`,
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="bmhFishingBarCol">
                                    <div className="bmhFishingBarLabel">장력</div>
                                    <div className="bmhFishingBarTrack">
                                        <div
                                            className="bmhFishingBarFill bmhFishingBarFillTension"
                                            style={{
                                                width: `${clamp01to100(displayTension)}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bmhFishingHintRow" style={{ marginTop: 10 }}>
                                <div
                                    className="bmhFishingHint"
                                    style={{ opacity: started ? 1 : 0.85 }}
                                >
                                    {hintText}
                                </div>

                                {/* 릴 감기(내 턴만) / 관전은 pill */}
                                {isMyTurn ? (
                                    <button
                                        className="bmhFishingHitBtn"
                                        style={{
                                            opacity: canControl ? 1 : 0.55,
                                            cursor: canControl ? "pointer" : "not-allowed",
                                            transform:
                                                largeReeling && canControl ? "scale(1.03)" : "scale(1)",
                                            filter:
                                                largeReeling && canControl
                                                    ? "drop-shadow(0 0 10px rgba(255,255,255,0.55))"
                                                    : "none",
                                        }}
                                        onMouseDown={onReelStart}
                                        onMouseUp={onReelStop}
                                        onMouseLeave={onReelStop}
                                        onTouchStart={(e) => {
                                            e.preventDefault();
                                            onReelStart();
                                        }}
                                        onTouchEnd={(e) => {
                                            e.preventDefault();
                                            onReelStop();
                                        }}
                                        disabled={!canControl}
                                    >
                                        릴 감기
                                    </button>
                                ) : (
                                    <div className="bmhFishingSpectatorPill">관전 중</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* 결과 모달 */}
                {result && (
                    <div className="bmhFishingResultOverlay">
                        <div className="bmhFishingResultCard">
                            <div className="bmhFishingResultTitle">{resultTitle}</div>
                            <div className="bmhFishingResultMsg">{resultText}</div>
                            <button className="bmhFishingOkBtn" onClick={handleOkClick}>
                                확인
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
