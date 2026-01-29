import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

// 토스트 표시 순서 고정(원하는 순서대로)
const RESOURCE_ORDER = ['STONE', 'WOOD', 'IRON', 'CLOTH', 'BRICK', 'WALLPAPER', 'CLAY', 'FLOORING'];

const FRUIT_ORDER = ['APPLE', 'ORANGE', 'PEAR', 'PEACH', 'CHERRY'];

const koName = (key) => {
  const map = {
    STONE: '돌',
    WOOD: '목재',
    IRON: '철광석',
    CLOTH: '천',
    BRICK: '벽돌',
    WALLPAPER: '벽지',
    CLAY: '점토',
    FLOORING: '바닥재',

    APPLE: '사과',
    ORANGE: '오렌지',
    PEAR: '배',
    PEACH: '복숭아',
    CHERRY: '체리',
  };
  return map[key] || key;
};

const getCount = (mapObj, key) => {
  if (!mapObj) return 0;
  const v = mapObj[key];
  return typeof v === 'number' ? v : 0;
};

// count가 너무 크면 파티클 과다 -> 제한
const particlesForCount = (count) => {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 3;
  if (count <= 6) return 5;
  return 7;
};

export default function RewardDrop({
  anchorRef, // ✅ character.webp wrapper ref
  gainedResources,
  gainedHarvests,
  durationMs = 1200,
  onDone,
}) {
  const [particles, setParticles] = useState([]);

  const entries = useMemo(() => {
    const list = [];

    const pushIf = (key, count) => {
      if (!count || count <= 0) return;
      list.push({
        key,
        label: koName(key),
        count,
        n: particlesForCount(count),
        srcCandidates: [`/images/inventory/${key}.webp`, `/images/inventory/${key}.png`],
      });
    };

    for (const k of RESOURCE_ORDER) pushIf(k, getCount(gainedResources, k));
    for (const k of FRUIT_ORDER) pushIf(k, getCount(gainedHarvests, k));

    return list;
  }, [gainedResources, gainedHarvests]);

  useEffect(() => {
    if (!entries.length) return;

    const el = anchorRef?.current;

    // anchor가 아직 없으면 안전하게 화면 중앙 위쪽으로
    const rect = el
      ? el.getBoundingClientRect()
      : {
          left: window.innerWidth * 0.5,
          top: window.innerHeight * 0.3,
          width: 0,
          height: 0,
        };

    // ✅ 머리 위 기준점 (wrapper 상단 중앙)
    const baseX = rect.left + rect.width / 2;
    const baseY = rect.top;

    const now = Date.now();
    const next = [];

    for (const e of entries) {
      for (let i = 0; i < e.n; i++) {
        const id = `${now}-${e.key}-${i}-${Math.random().toString(16).slice(2)}`;
        const dx = (Math.random() - 0.5) * 100; // 좌우 퍼짐
        const startY = baseY - (100 + Math.random() * 140); // 위에서 시작
        const delay = Math.random() * 220;

        next.push({
          id,
          label: e.label,
          count: e.count,
          srcCandidates: e.srcCandidates,
          left: baseX + dx,
          top: startY,
          delay,
        });
      }
    }

    setParticles(next);

    const t = setTimeout(() => {
      setParticles([]);
      onDone?.();
    }, durationMs);

    return () => clearTimeout(t);
  }, [anchorRef, entries, durationMs, onDone]);

  if (!particles.length) return null;

  return createPortal(
    <>
      <style>{`
        @keyframes rewardDropFall {
          0%   { transform: translate(-50%, -10px) scale(0.88); opacity: 0; }
          10%  { opacity: 1; }
          80%  { transform: translate(-50%, 140px) scale(1.04); opacity: 1; }
          100% { transform: translate(-50%, 170px) scale(0.96); opacity: 0; }
        }
        @keyframes rewardSpark {
          0%   { transform: translate(-50%, -50%) scale(0.6); opacity: 0; }
          35%  { opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1.4); opacity: 0; }
        }
        @keyframes rewardFloatText {
          0%   { transform: translate(-50%, 0) scale(0.9); opacity: 0; }
          15%  { opacity: 1; }
          100% { transform: translate(-50%, -34px) scale(1.0); opacity: 0; }
        }
      `}</style>

      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'fixed',
            left: p.left,
            top: p.top,
            zIndex: 30000,
            pointerEvents: 'none',
            animation: `rewardDropFall 900ms cubic-bezier(0.2, 0.85, 0.2, 1) forwards`,
            animationDelay: `${p.delay}ms`,
          }}
        >
          <img
            src={p.srcCandidates[0]}
            onError={(e) => {
              const cur = e.currentTarget;
              if (cur.dataset.fallbackDone === '1') {
                cur.style.opacity = '0';
                return;
              }
              cur.dataset.fallbackDone = '1';
              cur.src = p.srcCandidates[1];
            }}
            alt={p.label}
            draggable={false}
            style={{
              width: 44,
              height: 44,
              objectFit: 'contain',
              filter: 'drop-shadow(0 8px 12px rgba(0,0,0,0.35))',
            }}
          />

          {/* 반짝 */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '55%',
              width: 10,
              height: 10,
              borderRadius: 999,
              boxShadow: '0 0 18px rgba(255,255,255,0.9)',
              animation: `rewardSpark 520ms ease-out forwards`,
              animationDelay: `${p.delay + 120}ms`,
            }}
          />

          {/* +N 떠오르는 텍스트 */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: -10,
              color: 'white',
              fontWeight: 900,
              fontSize: 16,
              textShadow: '0 3px 10px rgba(0,0,0,0.6)',
              animation: `rewardFloatText 700ms ease-out forwards`,
              animationDelay: `${p.delay + 80}ms`,
              whiteSpace: 'nowrap',
            }}
          >
            +{p.count}
          </div>
        </div>
      ))}
    </>,
    document.body,
  );
}
