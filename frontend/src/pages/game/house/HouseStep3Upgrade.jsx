import React, { useMemo } from 'react';
import Subtitle from '../../../components/common/Subtitle.jsx';
import { COLORS, withAlpha } from '../../../constants/colors.js';
import { HOUSE_LEVEL_MAP, getHouseIconByLevel, normalizeHouseLevelByAny } from '../../../constants/houseLevel.js';
import { roEuro } from '../../../utils/josa.js';
import { CHARACTERS } from '../../../constants/characters.js';
import './HouseStep3Upgrade.css';

const ICON = {
  arrow: '/images/common/icon-arrow-right.svg',
  lock: '/images/common/icon-lock.svg',
};

// 플레이어 표시 이름 정규화
const getPlayerDisplayName = (player) => {
  const v = player?.nickname || player?.playerName || player?.memberName || player?.name || '플레이어';
  return String(v ?? '').trim() || '플레이어';
};

// 플레이어 현재 집 레벨 정규화
const getCurrentHouseLevel = (player) => {
  const cand = [player?.houseLevel, player?.house?.level, player?.house?.currentLevel, player?.homeLevel];
  const v = cand.find((x) => x !== undefined && x !== null);
  return normalizeHouseLevelByAny(v);
};

// 레벨 숫자로 HOUSE_LEVEL_MAP 메타 찾기
const pickLevelObj = (level) => (HOUSE_LEVEL_MAP || []).find((x) => Number(x?.level) === Number(level)) || null;

// characterId로 캐릭터 컬러 조회
const getCharacterColorById = (characterId) => {
  const id = Number(characterId);
  if (!Number.isFinite(id)) return null;
  const c = (Array.isArray(CHARACTERS) ? CHARACTERS : []).find((x) => Number(x?.id) === id) || null;
  const col = c?.color;
  return typeof col === 'string' && col.trim() ? col.trim() : null;
};

// mask 기반 단색 아이콘(잠금 등)
function MaskIcon({ src, sizePx, color, className = '', style = {} }) {
  const px = (v) => `calc(${v} * var(--s))`;
  const w = sizePx?.w ?? sizePx ?? 24;
  const h = sizePx?.h ?? sizePx ?? 24;

  return (
    <span
      className={`maskIcon ${className}`}
      style={{
        width: px(w),
        height: px(h),
        backgroundColor: color,
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
        ...style,
      }}
      aria-hidden="true"
    />
  );
}

// 문장 내 재료 토큰("철 1개") 추출
const pickResourceTokens = (msg) => {
  if (!msg) return [];
  const s = String(msg);
  const re = /([가-힣]+)\s*\d+\s*개/g;
  const out = [];
  let m;
  while ((m = re.exec(s)) !== null) {
    const token = m[0];
    if (token && !out.includes(token)) out.push(token);
  }
  return out;
};

// 문장 내 벨 토큰("290벨") 추출
const pickBellTokens = (msg) => {
  if (!msg) return [];
  const s = String(msg);
  const re = /(\d+\s*벨)/g;
  const out = [];
  let m;
  while ((m = re.exec(s)) !== null) {
    const token = String(m[1] || '').replace(/\s+/g, '');
    if (token && !out.includes(token)) out.push(token);
  }
  return out;
};

export default function HouseStep3Upgrade({
                                            player,
                                            isMyTurn,
                                            character,
                                            onBackToNaugul,
                                            onConfirmUpgrade,
                                            hasAllMaterials,
                                            lackMessage,
                                          }) {
  const myName = useMemo(() => getPlayerDisplayName(player), [player]);
  const characterId = player?.characterId;

  // 플레이어 강조색(캐릭터 컬러 우선)
  const playerColor = useMemo(
    () => getCharacterColorById(characterId) || character?.color || COLORS.ac.darkBrown,
    [characterId, character?.color],
  );

  // 현재/다음 레벨 메타 계산
  const currentLevel = useMemo(() => getCurrentHouseLevel(player), [player]);
  const nextLevel = currentLevel + 1;

  const curObj = useMemo(() => pickLevelObj(currentLevel), [currentLevel]);
  const nextObj = useMemo(() => pickLevelObj(nextLevel), [nextLevel]);

  const curName =
    curObj?.name || (currentLevel === 0 ? '없음' : currentLevel === 1 ? '땅' : `level ${currentLevel}`);

  const nextName =
    nextObj?.name || (nextLevel === 1 ? '땅' : nextLevel <= 5 ? `level ${nextLevel}` : '최고 레벨');

  // 현재/다음 아이콘(캐릭터별 아이콘 우선)
  const curIcon =
    curObj?.icon ||
    getHouseIconByLevel(curObj?.key ?? currentLevel, characterId) ||
    getHouseIconByLevel(currentLevel, characterId) ||
    null;

  const nextIcon =
    nextObj?.icon ||
    getHouseIconByLevel(nextObj?.key ?? nextLevel, characterId) ||
    getHouseIconByLevel(nextLevel, characterId) ||
    null;

  // 업그레이드 가능 여부(최대 레벨/재료 보유 기준)
  const isMaxLevel = !nextObj;
  const canUpgrade = typeof hasAllMaterials === 'boolean' ? hasAllMaterials : !isMaxLevel;

  const defaultLack = `${nextName}${roEuro(nextName)} 업그레이드 하려 왔나구리?\n아직 재료가 더 필요하다구리.`;

  const okText = `${myName}! 재료를 다 모아왔구나구리!\n${nextName}${roEuro(
    nextName,
  )} 업그레이드를 할 수 있다구리.\n집 업그레이드 공사를 진행하겠냐구리?`;

  // 대사(가능/불가 + 서버 부족 메시지 우선)
  const contentText = canUpgrade ? okText : (lackMessage && String(lackMessage).trim()) || defaultLack;

  // 업그레이드 불가면 선택지 숨김
  const options = canUpgrade
    ? [
      { text: '응! 해줘', onClick: () => isMyTurn && onConfirmUpgrade?.() },
      { text: '다음에 할게', onClick: () => isMyTurn && onBackToNaugul?.() },
    ]
    : [];

  // 하이라이트 토큰(재료/벨) 추출
  const resourceTokens = useMemo(() => pickResourceTokens(contentText), [contentText]);
  const bellTokens = useMemo(() => pickBellTokens(contentText), [contentText]);

  // 하이라이트(플레이어/집이름/재료/벨)
  const highlights = useMemo(() => {
    const hs = [];
    if (myName) hs.push({ text: myName, color: playerColor });
    if (nextName) hs.push({ text: nextName, color: COLORS.ac.nookCyan });

    bellTokens.forEach((t) => hs.push({ text: t, color: COLORS.ac.nookCyan }));
    resourceTokens.forEach((t) => hs.push({ text: t, color: COLORS.ac.nookCyan }));
    return hs;
  }, [myName, playerColor, nextName, bellTokens, resourceTokens]);

  // 다음 카드 강조(가능할 때만 청록 더 진하게)
  const nextCardStyle = canUpgrade ? { backgroundColor: withAlpha(COLORS.ac.nookCyan, 0.6) } : undefined;

  return (
    <>
      <div className="houseUpgPanel">
        <div className="houseUpgTitle">업그레이드 안내서</div>

        <div className="houseUpgRow">
          {/* 현재 집 */}
          <div className="houseUpgCard">
            <div className="houseUpgLevelBox">{curName}</div>

            <div className="houseUpgImgBox">
              {curIcon ? <img className="houseUpgHouseImg" src={curIcon} alt="cur-house" draggable={false} /> : null}
            </div>
          </div>

          {/* 화살표 */}
          <img className="houseUpgArrowImg" src={ICON.arrow} alt="arrow" draggable={false} />

          {/* 다음 집 */}
          <div className="houseUpgCard" style={nextCardStyle || undefined}>
            <div className="houseUpgLevelBox">{nextName}</div>

            <div className="houseUpgImgBox">
              {!canUpgrade ? (
                <div className="houseUpgLockedWrap">
                  {nextIcon ? (
                    <img className="houseUpgLockedHouseGhost" src={nextIcon} alt="ghost-house" draggable={false} />
                  ) : curIcon ? (
                    <img className="houseUpgLockedHouseGhost" src={curIcon} alt="ghost-house" draggable={false} />
                  ) : null}

                  <MaskIcon src={ICON.lock} sizePx={252} color={COLORS.ac.yellow} className="houseUpgLock" />
                </div>
              ) : nextIcon ? (
                <img className="houseUpgHouseImg" src={nextIcon} alt="next-house" draggable={false} />
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* 너굴 대사/선택지 */}
      <Subtitle
        nameText="너굴"
        nameColor={COLORS.characters.naugul.nameBox}
        nameTextColor={COLORS.characters.naugul.nameText}
        contentText={contentText}
        highlights={highlights}
        options={options}
        optionDisabled={!isMyTurn}
      />
    </>
  );
}
