import React, { useMemo } from 'react';
import { COLORS, withAlpha } from '../../../constants/colors.js';
import { HOUSE_LEVEL_MAP, getHouseIconByLevel } from '../../../constants/houseLevel.js';
import { rewardIconSrc, RESOURCE_ORDER, getCount } from '../../../constants/reward.js';

const IMG = {
  bell: '/images/board/icon-bell.webp',
};

// 레벨 객체에서 "필요 재화 목록"을 [{key,count}] 형태로 뽑기(0개는 제외)
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
  // level 1~5만 표시(안내서 카드 5개)
  const levels = useMemo(
    () => (HOUSE_LEVEL_MAP || []).filter((x) => Number(x.level) >= 1 && Number(x.level) <= 5),
    [],
  );

  // 패널/카드 배경색(스펙 색상 + 알파 적용)
  const PANEL_BG = withAlpha(COLORS.house.panelBrown, 0.9);
  const CARD_BG = withAlpha(COLORS.house.cardBrown, 0.6);

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
      {/* 상단 제목 */}
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
          color: TEXT,
          fontFamily: 'var(--font-gosanja)',
          fontSize: px(44),
          lineHeight: 1,
          whiteSpace: 'nowrap',
          textAlign: 'center',
        }}
      >
        집 재료 안내서
      </div>

      {/* 레벨 카드 5개(가로 정렬) */}
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

          // 레벨별 집 아이콘(레벨 5는 캐릭터별 houseImage도 고려)
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
                overflow: 'hidden',
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
              {/* 레벨 표시 */}
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

              {/* 집 이미지(고정 박스 안에 중앙 정렬) */}
              <div
                style={{
                  width: '100%',
                  height: px(152),
                  marginTop: px(24),
                  marginBottom: px(24),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                {houseIcon ? (
                  <img
                    src={houseIcon}
                    alt={`house-${levelNum}`}
                    draggable={false}
                    style={{
                      width: px(196),
                      height: px(152),
                      objectFit: 'contain',
                      display: 'block',
                      userSelect: 'none',
                      WebkitUserDrag: 'none',
                    }}
                  />
                ) : null}
              </div>

              {/* 집 이름 */}
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

              {/* 필요 재화(벨 + 재료들) */}
              <div
                style={{
                  height: px(212),
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: px(12),
                }}
              >
                {/* 벨 비용 */}
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

                {/* 재료 목록(2줄 이상이면 자동 줄바꿈) */}
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
