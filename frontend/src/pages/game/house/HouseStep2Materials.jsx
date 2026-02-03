import React, { useMemo } from 'react';
import { COLORS, withAlpha } from '../../../constants/colors.js';
import { HOUSE_LEVEL_MAP, getHouseIconByLevel } from '../../../constants/houseLevel.js';
import { rewardIconSrc, RESOURCE_ORDER, getCount } from '../../../constants/reward.js';

const IMG = {
  bell: '/images/board/icon-bell.webp',
};

const buildReqs = (levelObj) => {
  if (!levelObj) return [];
  return RESOURCE_ORDER
    .map((K) => {
      const lower = String(K).toLowerCase();
      const cnt = getCount(levelObj, lower);
      return { key: K, count: cnt };
    })
    .filter((x) => x.count > 0);
};

export default function HouseStep2Materials({ px, player }) {
  // ✅ level 1~5만 렌더링
  const levels = useMemo(
    () => (HOUSE_LEVEL_MAP || []).filter((x) => Number(x.level) >= 1 && Number(x.level) <= 5),
    [],
  );

  // ✅ 색상: black/white만 사용 + withAlpha
  const PANEL_BG = withAlpha(COLORS.ac.black, 0.55);
  const CARD_BG = withAlpha(COLORS.ac.black, 0.35);
  const TEXT = COLORS.ac.white;

  const characterId = player?.characterId;

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: px(1794),
        height: px(800),
        borderRadius: px(80),
        background: PANEL_BG,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      {/* 제목: w=1604, h=46, f=44, mt=44 */}
      <div
        style={{
          position: 'absolute',
          left: px(96),
          top: px(44),
          width: px(1604),
          height: px(46),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-gosanja)',
          fontSize: px(44),
          color: TEXT,
          lineHeight: 1,
          textAlign: 'center',
          whiteSpace: 'nowrap',
        }}
      >
        집 재료 안내서
      </div>

      {/* 등급 컨테이너: w=1604, h=600, top=128, gap=36 */}
      <div
        style={{
          position: 'absolute',
          left: px(96),
          top: px(128),
          width: px(1604),
          height: px(600),
          display: 'flex',
          gap: px(36),
        }}
      >
        {levels.map((lv) => {
          const levelNum = Number(lv.level);

          // ✅ level 5는 characterId 넘겨서 캐릭터별 houseImage
          const houseIcon =
            lv.icon ||
            getHouseIconByLevel(lv.key, characterId) ||
            getHouseIconByLevel(levelNum, characterId) ||
            null;

          const reqs = buildReqs(lv);
          const bell = typeof lv.bell === 'number' ? lv.bell : 0;

          return (
            <div
              key={lv.key}
              style={{
                width: px(292),
                height: px(600),
                borderRadius: px(60),
                background: CARD_BG,

                // ✅ 여기 중요: 296px 이미지가 292px 카드보다 커서,
                // overflow hidden이면 스펙대로 그려도 잘림.
                overflow: 'visible',

                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                paddingTop: px(44),
                paddingBottom: px(44),
                color: TEXT,
                fontFamily: 'var(--font-gosanja)',
                lineHeight: 1,
              }}
            >
              {/* 레벨 박스: h=32 f=32 */}
              <div
                style={{
                  height: px(32),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: px(32),
                  whiteSpace: 'nowrap',
                }}
              >
                {`level ${levelNum}`}
              </div>

              {/* 이미지박스: h=152, mt/mb=24 */}
              <div
                style={{
                  height: px(152),
                  marginTop: px(24),
                  marginBottom: px(24),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',

                  // ✅ 이미지가 296px라 카드보다 넓어도 “스펙 그대로” 보이게
                  overflow: 'visible',
                }}
              >
                {houseIcon ? (
                  <img
                    src={houseIcon}
                    alt={`house-${levelNum}`}
                    draggable={false}
                    style={{
                      width: px(296),
                      height: px(152),
                      objectFit: 'contain',
                      display: 'block',
                      userSelect: 'none',
                      WebkitUserDrag: 'none',
                    }}
                  />
                ) : null}
              </div>

              {/* 집 이름 박스: h=40 f=36 mb=28 */}
              <div
                style={{
                  height: px(40),
                  marginBottom: px(28),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: px(36),
                  whiteSpace: 'nowrap',
                }}
              >
                {lv.name || ''}
              </div>

              {/* 재화박스: h=212 gap=12 */}
              <div
                style={{
                  height: px(212),
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: px(12),
                }}
              >
                {/* 벨 row: icon 36x44, text f=28 */}
                <div
                  style={{
                    height: px(44),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: px(12),
                    fontSize: px(28),
                    whiteSpace: 'nowrap',
                  }}
                >
                  <img
                    src={IMG.bell}
                    alt="bell"
                    draggable={false}
                    style={{
                      width: px(36),
                      height: px(44),
                      objectFit: 'contain',
                      display: 'block',
                      userSelect: 'none',
                      WebkitUserDrag: 'none',
                    }}
                  />
                  <span>{`x${bell}`}</span>
                </div>

                {/* 재료 rows: row gap=12, column gap=28 */}
                <div
                  style={{
                    width: '100%',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    alignItems: 'center',
                    rowGap: px(12),
                    columnGap: px(28),
                  }}
                >
                  {reqs.map((r) => (
                    <div
                      key={r.key}
                      style={{
                        height: px(44),
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: px(12),
                        fontSize: px(28),
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <img
                        src={rewardIconSrc(r.key)}
                        alt={r.key}
                        draggable={false}
                        style={{
                          width: px(36),
                          height: px(44),
                          objectFit: 'contain',
                          display: 'block',
                          userSelect: 'none',
                          WebkitUserDrag: 'none',
                        }}
                      />
                      <span>{`x${r.count}`}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
