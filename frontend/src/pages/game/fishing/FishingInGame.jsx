// fishing/FishingInGame.jsx
import React from 'react';

import { COLORS, withAlpha } from '../../../constants/colors.js';

import './Fishing.css';

const clampPct = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
};

export default function FishingInGame({
                                        isMyTurn,
                                        markerPct,
                                        winStartPct,
                                        winEndPct,
                                        inWindow,

                                        isLarge,
                                        largeProgress,
                                        largeTension,
                                        largeReeling,
                                      }) {
  const m = clampPct(markerPct);
  const ws = clampPct(winStartPct);
  const we = clampPct(winEndPct);

  return (
    <>
      {/* ✅ 하단 HUD */}
      <div className="bmhFishing-hudRow">
        <div className="bmhFishing-hudLeft">
          <div className="bmhFishing-hudTitle">스페이스를 연타!</div>

          <div className="bmhFishing-gaugeTrack">
            <div
              className="bmhFishing-gaugeWindow"
              style={{
                left: `${Math.min(ws, we)}%`,
                width: `${Math.max(0, Math.abs(we - ws))}%`,
                background: withAlpha(COLORS.ac.nookCyan, 0.65),
              }}
            />
            <div className="bmhFishing-gaugeMarker" style={{ left: `${m}%` }} />
          </div>

          {isLarge && (
            <div className="bmhFishing-bars">
              <div className="bmhFishing-bar">
                <div className="bmhFishing-barLabel">진행도</div>
                <div className="bmhFishing-barTrack">
                  <div
                    className="bmhFishing-barFill"
                    style={{ width: `${clampPct(largeProgress)}%`, background: withAlpha(COLORS.ac.creamWhite, 0.75) }}
                  />
                </div>
              </div>

              <div className="bmhFishing-bar">
                <div className="bmhFishing-barLabel">장력</div>
                <div className="bmhFishing-barTrack">
                  <div
                    className="bmhFishing-barFill"
                    style={{ width: `${clampPct(largeTension)}%`, background: withAlpha(COLORS.ac.red, 0.75) }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bmhFishing-hudRight">
          <div className="bmhFishing-hudTitle">낚시대가 곧 부러질 거 같아...</div>
          <div className="bmhFishing-dangerTrack">
            <div
              className="bmhFishing-dangerFill"
              style={{
                width: `${inWindow ? 35 : 85}%`,
                background: withAlpha(COLORS.ac.red, 0.95),
              }}
            />
          </div>
        </div>
      </div>

      {!isMyTurn && <div className="bmhFishing-spectatorBlock" />}
    </>
  );
}
