import { useEffect, useMemo, useRef, useState } from "react";
import "./css/Swap.css";

const INTRO_IMG = "/images/swap/swap_intro.png";
const BACK_IMG = "/images/swap/swap_back.png";

// 캐릭터 ID -> 이름
const NAME_BY_CHARACTER_ID = {
  1: "애플",
  2: "빙티",
  3: "메이플",
  4: "미첼",
};

// 캐릭터 ID -> 포스터 경로
const POSTER_BY_CHARACTER_ID = {
  1: "/images/swap/apple_poster.webp",
  2: "/images/swap/bingti_poster.webp",
  3: "/images/swap/maple_poster.webp",
  4: "/images/swap/michel_poster.webp",
};

// 가운데 룰렛 카테고리 아이콘
const CENTER_ICON = {
  HOUSE: "🏠",
  BELL: "🔔",
  RESOURCE: "🧱",
  LOAN: "💳",
};

// 가운데 룰렛 방향 아이콘
const DIR_ICON = {
  TO_OTHER: "➡️",
  TO_ME: "⬅️",
  SWAP: "↔️",
};

// JSON 문자열을 안전하게 파싱
function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

// 룰렛 인덱스를 시간 기반으로 계산
function computeIndex(startAtEpochMs, nowEpochMs, cycleMs, len) {
  if (!startAtEpochMs || startAtEpochMs <= 0 || !cycleMs || cycleMs <= 0 || !len) return 0;
  const elapsed = Math.max(0, nowEpochMs - startAtEpochMs);
  return Math.floor(elapsed / cycleMs) % len;
}

export default function Swap({ isMyTurn, player, resultText, onConfirm, onExit }) {
  // 플레이어 uiStep을 stage로 사용
  // 0: 인트로
  // 1: 가운데 룰렛
  // 2: 대상 룰렛 또는 결과
  const stage = useMemo(() => Number(player?.uiStep ?? 0), [player?.uiStep]);

  // 서버가 보내는 payload JSON 파싱
  // resultText가 JSON이 아니면 null
  const payload = useMemo(() => {
    if (typeof resultText !== "string") return null;
    const trimmed = resultText.trim();
    if (!trimmed.startsWith("{")) return null;
    return safeJsonParse(trimmed);
  }, [resultText]);

  // 서버 phase 우선
  // 없으면 stage로 화면 단계를 추정
  const phase = payload?.phase ?? (stage === 0 ? "INTRO" : stage === 1 ? "SPIN_CENTER" : "SPIN_TARGET");

  // 액터 캐릭터 ID
  // payload 우선, 없으면 player 값 사용
  const actorCharacterId = Number(payload?.actorCharacterId ?? player?.characterId ?? 0);

  // 가운데 룰렛 옵션 배열
  const centerOptions = Array.isArray(payload?.centerOptions) ? payload.centerOptions : [];

  // 대상 후보 배열
  const targetCandidates = Array.isArray(payload?.targetCandidates) ? payload.targetCandidates : [];

  // 룰렛이 돌아가는 동안 now를 갱신해서 애니메이션 효과를 만듦
  const [nowMs, setNowMs] = useState(Date.now());
  const rafRef = useRef(null);

  useEffect(() => {
    if (phase !== "SPIN_CENTER" && phase !== "SPIN_TARGET") return;

    const tick = () => {
      setNowMs(Date.now());
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [phase]);

  // 서버가 고정한 가운데 인덱스
  // -1이면 아직 고정 전
  const lockedCenterIndex = useMemo(() => {
    const v = Number(payload?.lockedCenterIndex ?? -1);
    return v >= 0 ? v : null;
  }, [payload?.lockedCenterIndex]);

  // 서버가 고정한 대상 인덱스
  // -1이면 아직 고정 전
  const lockedTargetIndex = useMemo(() => {
    const v = Number(payload?.lockedTargetIndex ?? -1);
    return v >= 0 ? v : null;
  }, [payload?.lockedTargetIndex]);

  // 가운데 룰렛 현재 인덱스
  // locked가 있으면 locked를 그대로 사용
  // 없으면 시간 기반으로 계산
  const centerIdx = useMemo(() => {
    if (!centerOptions.length) return 0;
    if (lockedCenterIndex != null) return lockedCenterIndex;

    const startAt = Number(payload?.centerStartAt ?? 0);
    const cycleMs = Number(payload?.centerCycleMs ?? 0);
    return computeIndex(startAt, nowMs, cycleMs, centerOptions.length);
  }, [centerOptions.length, lockedCenterIndex, payload?.centerStartAt, payload?.centerCycleMs, nowMs]);

  // 대상 룰렛 현재 인덱스
  // locked가 있으면 locked를 그대로 사용
  // 없으면 시간 기반으로 계산
  const targetIdx = useMemo(() => {
    if (!targetCandidates.length) return 0;
    if (lockedTargetIndex != null) return lockedTargetIndex;

    const startAt = Number(payload?.targetStartAt ?? 0);
    const cycleMs = Number(payload?.targetCycleMs ?? 0);
    return computeIndex(startAt, nowMs, cycleMs, targetCandidates.length);
  }, [targetCandidates.length, lockedTargetIndex, payload?.targetStartAt, payload?.targetCycleMs, nowMs]);

  // 현재 선택된 가운데 옵션과 대상 후보
  const centerPick = centerOptions[centerIdx] ?? null;
  const targetPick = targetCandidates[targetIdx] ?? null;

  // 왼쪽 포스터와 이름
  const leftPoster = POSTER_BY_CHARACTER_ID[actorCharacterId];
  const leftName = NAME_BY_CHARACTER_ID[actorCharacterId] ?? "나";

  // 오른쪽 포스터와 이름
  const rightCharId = Number(targetPick?.characterId ?? 0);
  const rightPoster = POSTER_BY_CHARACTER_ID[rightCharId];
  const rightName = NAME_BY_CHARACTER_ID[rightCharId] ?? "상대";

  // 결과 문구
  // payload.resultSummary가 있으면 그걸 사용
  // JSON이 아닌 문자열이 오면 그대로 결과로 사용
  const resultSummary = useMemo(() => {
    const s = payload?.resultSummary;
    if (typeof s === "string" && s.trim()) return s.trim();
    if (typeof resultText === "string" && !resultText.trim().startsWith("{")) return resultText.trim();
    return "";
  }, [payload?.resultSummary, resultText]);

  // 스페이스바 입력으로 확정 전송
  // 내 턴만 가능
  useEffect(() => {
    if (!isMyTurn) return;

    const onKeyDown = (e) => {
      if (e.code !== "Space") return;
      e.preventDefault();
      if (typeof onConfirm === "function") onConfirm();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMyTurn, onConfirm]);

  // 인트로 화면 클릭으로 확정 전송
  // 내 턴 + stage 0만 가능
  const onIntroClick = () => {
    if (!isMyTurn) return;
    if (stage !== 0) return;
    if (typeof onConfirm === "function") onConfirm();
  };

  // 결과 화면에서 자동 종료를 한 번만 수행
  const exitOnceRef = useRef(false);
  const autoExitTimerRef = useRef(null);

  // stage가 2보다 작아지면 자동 종료 상태를 초기화
  useEffect(() => {
    if (stage < 2) {
      exitOnceRef.current = false;
      if (autoExitTimerRef.current) {
        clearTimeout(autoExitTimerRef.current);
        autoExitTimerRef.current = null;
      }
    }
  }, [stage]);

  // RESOLVED 상태에서 2초 후 onExit 호출
  // 내 턴만 가능
  useEffect(() => {
    if (!isMyTurn) return;
    if (phase !== "RESOLVED") return;
    if (exitOnceRef.current) return;

    if (autoExitTimerRef.current) {
      clearTimeout(autoExitTimerRef.current);
      autoExitTimerRef.current = null;
    }

    autoExitTimerRef.current = setTimeout(() => {
      if (exitOnceRef.current) return;
      exitOnceRef.current = true;
      if (typeof onExit === "function") onExit();
    }, 2000);

    return () => {
      if (autoExitTimerRef.current) {
        clearTimeout(autoExitTimerRef.current);
        autoExitTimerRef.current = null;
      }
    };
  }, [isMyTurn, phase, onExit]);

  // stage 0은 인트로 화면만 표시
  if (stage === 0) {
    return (
      <div className="swap-scene">
        <img
          className={`swap-full ${isMyTurn ? "is-clickable" : ""}`}
          src={INTRO_IMG}
          alt="swap intro"
          onClick={onIntroClick}
        />
        <div className={`swap-hud ${isMyTurn ? "is-myturn" : "is-watch"}`}>
          {isMyTurn ? "클릭 또는 스페이스바로 시작" : "관전 중…"}
        </div>
      </div>
    );
  }

  // 가운데 룰렛 표시 데이터
  const centerCategory = centerPick?.category ?? "HOUSE";
  const centerDirection = centerPick?.direction ?? "SWAP";
  const centerIcon = CENTER_ICON[centerCategory] ?? "❔";
  const dirIcon = DIR_ICON[centerDirection] ?? "↔️";

  // 서버에서 고정 여부
  const centerLocked = lockedCenterIndex != null;
  const targetLocked = lockedTargetIndex != null;

  // 결과 화면 여부
  const showResult = phase === "RESOLVED";

  // 가운데 라벨 텍스트
  const centerLabel =
    centerCategory === "HOUSE"
      ? "집"
      : centerCategory === "BELL"
        ? "벨"
        : centerCategory === "RESOURCE"
          ? "재화"
          : centerCategory === "LOAN"
            ? "대출금"
            : "???";

  return (
    <div className="swap-scene">
      <img className="swap-full" src={BACK_IMG} alt="swap back" />

      {/* 왼쪽 액터 영역 */}
      <div className="swap-left">
        {leftPoster ? (
          <img className="swap-poster" src={leftPoster} alt="actor poster" />
        ) : (
          <div className="swap-posterFallback">내 포스터</div>
        )}
        <div className="swap-name">{leftName}</div>
      </div>

      {/* 가운데 룰렛 영역 */}
      <div className="swap-center">
        <div className={`swap-centerCard ${centerLocked ? "is-locked" : ""}`}>
          <div className="swap-centerIcon">{centerIcon}</div>
          <div className="swap-centerDir">{dirIcon}</div>
          <div className="swap-centerLabel">{centerLabel}</div>
        </div>

        <div className="swap-subHint">
          {showResult
            ? "결과 적용 중…"
            : stage === 1
              ? isMyTurn
                ? "스페이스바로 교환할 물건 결과 확정"
                : "교환할 물건 결과 확정 대기…"
              : isMyTurn
                ? "스페이스바로 대상 확정"
                : "대상 확정 대기…"}
        </div>

        {showResult && (
          <div className="swap-resultBox">
            <div className="swap-resultTitle">결과</div>
            <div className="swap-resultText">{resultSummary ? resultSummary : "처리 중…"}</div>
            <div className="swap-resultHint">잠시 후 자동으로 종료됩니다</div>
          </div>
        )}
      </div>

      {/* 오른쪽 대상 영역 */}
      <div className="swap-right">
        {rightPoster ? (
          <img className={`swap-poster ${targetLocked ? "is-locked" : ""}`} src={rightPoster} alt="target poster" />
        ) : (
          <div className={`swap-posterFallback ${targetLocked ? "is-locked" : ""}`}>상대 포스터</div>
        )}
        <div className="swap-name">{rightName}</div>
      </div>

      {/* 하단 상태 표시 영역 */}
      <div className={`swap-hud ${isMyTurn ? "is-myturn" : "is-watch"}`}>{isMyTurn ? "내 턴" : "관전"}</div>
    </div>
  );
}
