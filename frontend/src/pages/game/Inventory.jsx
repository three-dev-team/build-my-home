import { useEffect, useMemo, useRef } from 'react';
import ExitButton from '../../components/common/ExitButton.jsx';
import {
  RESOURCE_ORDER,
  FRUIT_ORDER,
  FISH_ORDER,
  koName,
  getCount,
  rewardIconSrc,
} from '../../constants/reward.js';
import { COLORS } from '../../constants/colors.js';

export default function Inventory({ player, onClose }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    const onKeyDown = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handleOverlayMouseDown = (e) => {
    if (e.target === overlayRef.current) onClose?.();
  };

  if (!player) return null;

  const MODAL_W = 1296;
  const MODAL_H = 555;

  const BOX_W = 100;
  const BOX_H = 96;

  const ICON_W = 84;
  const ICON_H = 80;

  const CIRCLE = 40;
  const CIRCLE_COLOR = '#EDDECA';

  const COL_BOTTOM = [48, 68, 88, 104, 112, 112, 104, 88, 68, 48];
  const COLS = 10;
  const ROWS = 4;

  const START_X = Math.round((MODAL_W - COLS * BOX_W) / 2);

  const leftPct = (xPx) => `${(xPx / MODAL_W) * 100}%`;
  const topPct = (yPx) => `${(yPx / MODAL_H) * 100}%`;

  const wByModal = (px) => `calc(var(--modalW) * ${px} / ${MODAL_W})`;
  const hByModal = (px) => `calc(var(--modalH) * ${px} / ${MODAL_H})`;

  const BOX_CENTERS = useMemo(() => {
    const out = [];
    for (let rTop = ROWS - 1; rTop >= 0; rTop--) {
      for (let c = 0; c < COLS; c++) {
        const bottom = COL_BOTTOM[c];
        const colLeft = START_X + c * BOX_W;
        const cx = colLeft + BOX_W / 2;

        const r = rTop;
        const cy = MODAL_H - bottom - r * BOX_H - BOX_H / 2;

        out.push([cx, cy]);
      }
    }
    return out;
  }, []);

  const entries = useMemo(() => {
    const list = [];
    const pushIfOwned = (prefix, key, count) => {
      if (!count || count <= 0) return;
      list.push({ id: `${prefix}_${key}`, key, label: koName(key), count, src: rewardIconSrc(key) });
    };

    for (const k of RESOURCE_ORDER || []) {
      if (k === 'STONE') continue;
      pushIfOwned('RES', k, getCount(player.resources, k));
    }
    for (const k of FRUIT_ORDER || []) pushIfOwned('HAR', k, getCount(player.harvests, k));
    for (const k of FISH_ORDER || []) pushIfOwned('FISH', k, getCount(player.harvests, k));

    return list;
  }, [player.resources, player.harvests]);

  const slotItems = entries.slice(0, 40);

  const CLOSE_X = 1248;
  const CLOSE_Y = 285;

  const BG_SRC = '/images/inventory/ui-inventory.svg';

  const numFill = COLORS.ac.darkBrown;
  const numStroke = COLORS.ac.creamIvory;

  return (
    <div
      ref={overlayRef}
      onMouseDown={handleOverlayMouseDown}
      className="fixed inset-0 z-[10000] bg-black/25"
    >
      <div className="absolute inset-0">
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            width: '67.5cqw',
            height: '51.39cqh',
            top: '9.26cqh',
            isolation: 'isolate',
            pointerEvents: 'auto',
            '--modalW': '67.5cqw',
            '--modalH': '51.39cqh',
          }}
        >
          <img
            src={BG_SRC}
            alt=""
            draggable={false}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'fill',
              display: 'block',
              userSelect: 'none',
              pointerEvents: 'none',
              filter: 'drop-shadow(0 12px 28px rgba(0,0,0,0.18))',
            }}
          />

          <div
            style={{
              position: 'absolute',
              left: leftPct(CLOSE_X),
              top: topPct(CLOSE_Y),
              transform: 'translate(-100%, -50%)',
              zIndex: 5,
            }}
          >
            <ExitButton onClick={onClose} label="닫기" />
          </div>

          {/* 슬롯 배경 원 */}
          {BOX_CENTERS.map(([cx, cy], idx) => (
            <div
              key={`slot_${idx}`}
              style={{
                position: 'absolute',
                left: leftPct(cx),
                top: topPct(cy),
                transform: 'translate(-50%, -50%)',
                width: wByModal(BOX_W),
                height: hByModal(BOX_H),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
                zIndex: 2,
              }}
            >
              <div
                style={{
                  width: wByModal(CIRCLE),
                  height: wByModal(CIRCLE),
                  borderRadius: 9999,
                  background: CIRCLE_COLOR,
                }}
              />
            </div>
          ))}

          {/* 아이콘 + 수량 */}
          {slotItems.map((it, idx) => {
            const [cx, cy] = BOX_CENTERS[idx];
            return (
              <div
                key={it.id}
                title={`${it.label} : ${it.count}`}
                style={{
                  position: 'absolute',
                  left: leftPct(cx),
                  top: topPct(cy),
                  transform: 'translate(-50%, -50%)',
                  width: wByModal(ICON_W),
                  height: hByModal(ICON_H),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                  zIndex: 3,
                }}
              >
                <img
                  src={it.src}
                  alt={it.label}
                  draggable={false}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    userSelect: 'none',
                    filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.25))',
                  }}
                />

                <div
                  style={{
                    position: 'absolute',
                    right: wByModal(-4),
                    bottom: hByModal(-4),
                    color: numFill,
                    fontSize: wByModal(32),
                    fontWeight: 900,
                    lineHeight: hByModal(32),
                    WebkitTextStroke: `${wByModal(8)} ${numStroke}`,
                    paintOrder: 'stroke fill',
                    textRendering: 'geometricPrecision',
                    userSelect: 'none',
                  }}
                >
                  {it.count}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
