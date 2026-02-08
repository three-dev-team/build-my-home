import { useEffect, useMemo, useRef, useState } from 'react';

const toNum = (v, fallback = 0) => {
  // 숫자 파싱(안 되면 fallback)
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const clampPct = (v) => {
  // 0~100 클램프
  const n = toNum(v, 0);
  return Math.max(0, Math.min(100, n));
};

const pick = (objA, objB, key, fallback = undefined) => {
  // objA 우선, 없으면 objB에서 key 가져오기
  const av = objA?.[key];
  if (av !== undefined && av !== null) return av;
  const bv = objB?.[key];
  if (bv !== undefined && bv !== null) return bv;
  return fallback;
};

// 서버 FishingHandler.computeGaugeMarkerPct()와 동일(ping-pong)
const computePingPongPct = (startAtEpochMs, nowEpochMs, cycleMs) => {
  const c = Math.max(0, toNum(cycleMs, 0));
  if (!c) return 0;

  const elapsed = Math.max(0, nowEpochMs - startAtEpochMs);
  const mod = elapsed % c;

  const phase = mod / c; // 0..1
  if (phase <= 0.5) return clampPct(phase * 2.0 * 100.0);
  return clampPct((1.0 - (phase - 0.5) * 2.0) * 100.0);
};

const isLargeByHarvestType = (harvestType) => {
  // 대형/레어 판별
  const ht = String(harvestType ?? '').trim().toUpperCase();
  return ht === 'FISH_LARGE' || ht === 'FISH_RARE';
};

export default function useFishingEventState(startedMsg, updateMsg, resultMsg, opts = {}) {
  const started = startedMsg ?? null;
  const update = updateMsg ?? null;
  const result = resultMsg ?? null;

  // 로컬 keydown 유지(누르고 있는 동안 보이게)
  const localReeling = !!opts?.localReeling;

  // started.params 안전 추출
  const startedParams =
    started && typeof started === 'object' && started.params && typeof started.params === 'object'
      ? started.params
      : null;

  const [nowTick, setNowTick] = useState(() => Date.now()); // 소/중 marker tick
  const [uiTick, setUiTick] = useState(() => Date.now()); // 대/레어 UI tick

  // 서버 스냅샷(기준)
  const serverLargeRef = useRef({
    progress: 0,
    tension: 0,
    reeling: false,
  });

  // 표시용(보간)
  const uiLargeRef = useRef({
    progress: 0,
    tension: 0,
    lastUiAt: 0,
  });

  useEffect(() => {
    // started 새로 오면 기준값 리셋
    const p = clampPct(pick(started, startedParams, 'progress', pick(started, null, 'progress', 0)));
    const t = clampPct(pick(started, startedParams, 'tension', pick(started, null, 'tension', 0)));
    const r = Boolean(pick(started, startedParams, 'reeling', pick(started, null, 'reeling', false)));
    const now = Date.now();

    serverLargeRef.current = { progress: p, tension: t, reeling: r };
    uiLargeRef.current = { progress: p, tension: t, lastUiAt: now };
  }, [started, startedParams]);

  useEffect(() => {
    // update 오면 서버 기준값 갱신 + UI도 즉시 스냅
    if (!update) return;

    const upProg = clampPct(pick(update, null, 'progress', 0));
    const upTens = clampPct(pick(update, null, 'tension', 0));
    const upReel = Boolean(pick(update, null, 'reeling', false));

    serverLargeRef.current = { progress: upProg, tension: upTens, reeling: upReel };

    uiLargeRef.current.progress = upProg;
    uiLargeRef.current.tension = upTens;
    uiLargeRef.current.lastUiAt = Date.now();
  }, [update]);

  const computed = useMemo(() => {
    // stage는 update 우선
    const stage = toNum(pick(update, null, 'stage', pick(started, startedParams, 'stage', 1)), 1);

    // started 기반 핵심 파라미터
    const eventStartTimeMs = toNum(
      pick(started, null, 'eventStartTimeMs', pick(started, startedParams, 'eventStartTimeMs', 0)),
      0
    );
    const durationMs = toNum(
      pick(started, null, 'durationMs', pick(started, startedParams, 'durationMs', 0)),
      0
    );
    const gaugeCycleMs = toNum(pick(started, startedParams, 'gaugeCycleMs', 0), 0);

    const harvestType = String(
      pick(started, null, 'harvestType', pick(started, startedParams, 'harvestType', '')) ?? ''
    ).trim();

    const isLarge = isLargeByHarvestType(harvestType) || started?.isLarge === true;

    // 소/중 히트 윈도우
    const firstCenter = clampPct(pick(started, startedParams, 'firstWindowCenterPct', 0));
    const firstWidth = clampPct(pick(started, startedParams, 'firstWindowWidthPct', 0));
    const secondCenter = clampPct(pick(started, startedParams, 'secondWindowCenterPct', 0));
    const secondWidth = clampPct(pick(started, startedParams, 'secondWindowWidthPct', 0));

    const isStage2 = stage >= 2;
    const center = isStage2 ? secondCenter : firstCenter;
    const width = isStage2 ? secondWidth : firstWidth;

    const half = width / 2.0;
    const winStartPct = clampPct(center - half);
    const winEndPct = clampPct(center + half);

    // 소/중 marker
    const markerPct =
      eventStartTimeMs > 0 && gaugeCycleMs > 0 ? computePingPongPct(eventStartTimeMs, nowTick, gaugeCycleMs) : 0;

    const inWindow =
      markerPct >= Math.min(winStartPct, winEndPct) && markerPct <= Math.max(winStartPct, winEndPct);

    // 대/레어 보간
    const server = serverLargeRef.current;
    const ui = uiLargeRef.current;

    const serverReeling = !!server.reeling;
    const effectiveReeling = isLarge && (localReeling || serverReeling);

    let largeProgress = clampPct(server.progress);
    let largeTension = clampPct(server.tension);

    if (isLarge && effectiveReeling) {
      const now = uiTick;
      const last = ui.lastUiAt || now;
      const dt = Math.max(0, now - last);

      const PROGRESS_PER_SEC = 20;
      const TENSION_PER_SEC = 16;

      ui.progress = clampPct(ui.progress + (PROGRESS_PER_SEC * dt) / 1000);
      ui.tension = clampPct(ui.tension + (TENSION_PER_SEC * dt) / 1000);
      ui.lastUiAt = now;

      const serverIsZeroish = server.progress <= 0.001 && server.tension <= 0.001;
      const MAX_AHEAD = serverIsZeroish ? 100 : 25;

      largeProgress = clampPct(Math.min(ui.progress, server.progress + MAX_AHEAD));
      largeTension = clampPct(Math.min(ui.tension, server.tension + MAX_AHEAD));
    } else if (isLarge) {
      // 감는 중이 아니면 서버 값으로 정합
      ui.progress = clampPct(server.progress);
      ui.tension = clampPct(server.tension);
      ui.lastUiAt = uiTick;
      largeProgress = ui.progress;
      largeTension = ui.tension;
    }

    const isResult = !!result && String(result?.type ?? '').trim() === 'ROOM_EVENT_RESULT';

    return {
      eventStartTimeMs,
      durationMs,
      gaugeCycleMs,

      harvestType,
      isLarge,
      stage,

      winStartPct,
      winEndPct,
      markerPct,
      inWindow,

      largeProgress,
      largeTension,
      largeReeling: effectiveReeling,

      isResult,
    };
  }, [started, startedParams, update, result, nowTick, uiTick, localReeling]);

  useEffect(() => {
    // 소/중: marker rAF tick
    const shouldTick =
      !!started && !computed.isResult && computed.gaugeCycleMs > 0 && computed.eventStartTimeMs > 0;
    if (!shouldTick) return;

    let raf = 0;
    const loop = () => {
      setNowTick(Date.now());
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [started, computed.isResult, computed.gaugeCycleMs, computed.eventStartTimeMs]);

  useEffect(() => {
    // 대/레어: UI rAF tick
    const shouldTick = !!started && !computed.isResult && computed.isLarge;
    if (!shouldTick) return;

    let raf = 0;
    const loop = () => {
      setUiTick(Date.now());
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [started, computed.isResult, computed.isLarge]);

  return computed;
}
