import { useEffect, useRef, useState } from 'react';
import useFishingEventState from './FishingEventState.jsx';
import './Fishing.css';

const clampPct = (v) => {
  // 0~100 클램프
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
};

const isEditableTarget = (target) => {
  // 입력 중(인풋/텍스트영역/콘텐츠에디터)이면 키 입력 무시
  const tag = (target?.tagName || '').toLowerCase();
  return tag === 'input' || tag === 'textarea' || target?.isContentEditable;
};

const inRange = (x, a, b) => {
  // x가 [min(a,b), max(a,b)] 범위 안인지
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return x >= lo && x <= hi;
};

export default function FishingInGame({ isMyTurn, eventMessage, lastUpdateMessage, onFishingAction }) {
  const startedMsg = eventMessage || null;
  const updateMsg = lastUpdateMessage || null;

  const [localReeling, setLocalReeling] = useState(false);
  const st = useFishingEventState(startedMsg, updateMsg, null, { localReeling });

  const [hitFlashOn, setHitFlashOn] = useState(false);
  const [missFlashOn, setMissFlashOn] = useState(false);
  const isLarge = !!st.isLarge;

  const armedRef = useRef(true);
  const reelingRef = useRef(false);

  const latestRef = useRef({
    isMyTurn: false,
    hasStarted: false,
    isLarge: false,
    onFishingAction: null,

    winStartPct: 0,
    winEndPct: 0,
    markerPct: 0,
  });

  useEffect(() => {
    // 키 이벤트 핸들러에서 최신 props 접근용
    latestRef.current = {
      ...latestRef.current,
      isMyTurn: !!isMyTurn,
      hasStarted: !!startedMsg,
      isLarge: !!isLarge,
      onFishingAction,
    };
  }, [isMyTurn, startedMsg, isLarge, onFishingAction]);

  useEffect(() => {
    // 판정용 수치도 ref에 최신화(리스너 1회 부착)
    latestRef.current.winStartPct = clampPct(st.winStartPct);
    latestRef.current.winEndPct = clampPct(st.winEndPct);
    latestRef.current.markerPct = clampPct(st.markerPct);
  }, [st.winStartPct, st.winEndPct, st.markerPct]);

  useEffect(() => {
    // started 새로 오면 로컬 상태 리셋
    armedRef.current = true;
    reelingRef.current = false;
    setLocalReeling(false);
    setHitFlashOn(false);
    setMissFlashOn(false);
  }, [startedMsg]);

  useEffect(() => {
    // 서버 reeling 상태 반영(로컬 reeling은 서버가 끊으면 해제)
    reelingRef.current = !!st.largeReeling;
    if (!st.largeReeling) setLocalReeling(false);
  }, [st.largeReeling]);

  useEffect(() => {
    // 스페이스 키로 액션 전송(HIT / REEL_START / REEL_STOP)
    const onKeyDown = (e) => {
      if (e.code !== 'Space') return;

      const cur = latestRef.current;
      if (!cur.isMyTurn) return;
      if (!cur.hasStarted) return;
      if (isEditableTarget(e.target)) return;

      e.preventDefault();
      e.stopPropagation();

      if (e.repeat) return;

      if (cur.isLarge) {
        // LARGE: 누르기 시작 -> REEL_START
        if (reelingRef.current) return;

        reelingRef.current = true;
        setLocalReeling(true);
        cur.onFishingAction?.('REEL_START');

        setHitFlashOn(true);
        window.setTimeout(() => setHitFlashOn(false), 130);
        return;
      }

      // SMALL/MEDIUM: HIT + miss 플래시
      if (!armedRef.current) return;
      armedRef.current = false;

      cur.onFishingAction?.('HIT');

      const ok = inRange(cur.markerPct, cur.winStartPct, cur.winEndPct);
      if (!ok) {
        setMissFlashOn(true);
        window.setTimeout(() => setMissFlashOn(false), 220);
      }

      setHitFlashOn(true);
      window.setTimeout(() => setHitFlashOn(false), 130);
    };

    const onKeyUp = (e) => {
      if (e.code !== 'Space') return;

      const cur = latestRef.current;
      if (!cur.isMyTurn) return;
      if (!cur.hasStarted) return;

      if (cur.isLarge) {
        // LARGE: 누르기 종료 -> REEL_STOP
        if (!reelingRef.current) return;

        reelingRef.current = false;
        setLocalReeling(false);
        cur.onFishingAction?.('REEL_STOP');
        return;
      }

      // SMALL/MEDIUM: 다음 HIT 가능
      armedRef.current = true;
    };

    window.addEventListener('keydown', onKeyDown, { passive: false });
    window.addEventListener('keyup', onKeyUp);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  if (!isLarge) {
    // SMALL / MEDIUM UI
    const ws = clampPct(st.winStartPct);
    const we = clampPct(st.winEndPct);
    const left = Math.min(ws, we);
    const width = Math.max(0, Math.abs(we - ws));
    const marker = clampPct(st.markerPct);

    const winCenter = clampPct(left + width / 2);

    return (
      <div className="bmhFishing-smWrap">
        <div className="bmhFishing-smTop">
          <div className="bmhFishing-smTopWin" style={{ left: `${left}%`, width: `${width}%` }} />
          <div
            className="bmhFishing-smTitle"
            style={{
              left: `${winCenter}%`,
              color: missFlashOn ? 'var(--bmhFishing-lgTensionFill)' : undefined,
              textShadow: missFlashOn ? `0 2px 10px rgba(0,0,0,0.6)` : undefined,
            }}
          >
            {missFlashOn ? 'miss!' : 'space!'}
          </div>
        </div>

        <div className={`bmhFishing-smTrack ${hitFlashOn ? 'isFlash' : ''}`}>
          <div className="bmhFishing-smWindow" style={{ left: `${left}%`, width: `${width}%` }} />

          <div
            className="bmhFishing-smMarker"
            style={{
              left: `${marker}%`,
              background: hitFlashOn ? 'var(--bmhFishing-smMarkerBgFlash)' : 'var(--bmhFishing-smMarkerBg)',
            }}
          />
        </div>
      </div>
    );
  }

  // LARGE / RARE UI
  return (
    <div className="bmhFishing-lgWrap">
      <div className="bmhFishing-lgRow">
        <div className="bmhFishing-lgBox">
          <div className="bmhFishing-lgTitle">스페이스를 연타!</div>
          <div className="bmhFishing-lgTrack">
            <div
              className="bmhFishing-lgFill bmhFishing-lgFill--progress"
              style={{ width: `${clampPct(st.largeProgress)}%` }}
            />
          </div>
        </div>

        <div className="bmhFishing-lgBox">
          <div className="bmhFishing-lgTitle">낚시대가 곧 부러질 것 같아!</div>
          <div className="bmhFishing-lgTrack">
            <div
              className="bmhFishing-lgFill bmhFishing-lgFill--tension"
              style={{ width: `${clampPct(st.largeTension)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
