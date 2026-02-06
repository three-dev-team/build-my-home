// fishing/useFishingEventState.jsx
import { useMemo } from 'react';

const toNum = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const clampPct = (v) => {
  const n = toNum(v, 0);
  return Math.max(0, Math.min(100, n));
};

export default function useFishingEventState(eventMessage) {
  return useMemo(() => {
    const raw = eventMessage ?? null;

    // ✅ 메시지 type 후보를 최대한 폭넓게 수용
    const type = String(raw?.type ?? raw?.eventType ?? raw?.messageType ?? '').trim();

    const isStarted =
      type === 'ROOM_EVENT_STARTED' ||
      type === 'FISHING_STARTED' ||
      type === 'STARTED' ||
      raw?.started === true;

    const isUpdate =
      type === 'ROOM_EVENT_UPDATE' ||
      type === 'FISHING_UPDATE' ||
      type === 'UPDATE';

    const isResult =
      type === 'ROOM_EVENT_RESULT' ||
      type === 'FISHING_RESULT' ||
      type === 'RESULT' ||
      raw?.result === true;

    // ✅ “대기 시작중”/“만료” 같은 플래그(없으면 false)
    const isPendingStart = raw?.pendingStart === true || type === 'PENDING_START';
    const isExpired = raw?.expired === true || type === 'EXPIRED';

    // ✅ bait
    const baitAvailable = raw?.baitAvailable === true || raw?.hasBait === true;
    const baitUsed = raw?.baitUsed === true || raw?.usedBait === true;

    // ✅ 난이도/물고기 타입
    const size = String(raw?.size ?? raw?.fishSize ?? '').toUpperCase();
    const isLarge = size === 'LARGE' || raw?.isLarge === true;

    // ✅ 게이지
    const markerPct = clampPct(raw?.markerPct ?? raw?.marker ?? raw?.cursorPct);
    const winStartPct = clampPct(raw?.winStartPct ?? raw?.winStart ?? raw?.windowStartPct);
    const winEndPct = clampPct(raw?.winEndPct ?? raw?.winEnd ?? raw?.windowEndPct);
    const inWindow =
      raw?.inWindow === true ||
      (markerPct >= Math.min(winStartPct, winEndPct) && markerPct <= Math.max(winStartPct, winEndPct));

    // ✅ LARGE 전용
    const largeProgress = clampPct(raw?.largeProgress ?? raw?.progressPct ?? raw?.progress);
    const largeTension = clampPct(raw?.largeTension ?? raw?.tensionPct ?? raw?.tension);
    const largeReeling = raw?.largeReeling === true || raw?.reeling === true;

    // ✅ 결과 메시지
    const resultMessage = String(raw?.message ?? raw?.resultMessage ?? '').trim();

    return {
      raw,
      type,

      baitAvailable,
      baitUsed,

      isStarted,
      isUpdate,
      isResult,

      isPendingStart,
      isExpired,

      isLarge,

      markerPct,
      winStartPct,
      winEndPct,
      inWindow,

      largeProgress,
      largeTension,
      largeReeling,

      resultMessage,
    };
  }, [eventMessage]);
}
