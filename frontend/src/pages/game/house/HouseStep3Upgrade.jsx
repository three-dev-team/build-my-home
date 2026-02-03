import React, { useMemo } from 'react';
import Subtitle from '../../../components/common/Subtitle.jsx';
import { COLORS, withAlpha } from '../../../constants/colors.js';
import { HOUSE_LEVEL_MAP, getHouseIconByLevel } from '../../../constants/houseLevel.js';
import { CHARACTERS } from '../../../constants/characters.js';
import './HouseStep3Upgrade.css';

const ICON = {
  arrow: '/images/common/icon-arrow-right.svg',
  lock: '/images/common/icon-lock.svg',
};

// player에서 표시용 이름을 안전하게 추출
const getPlayerDisplayName = (player) =>
  player?.nickname || player?.playerName || player?.memberName || player?.name || '플레이어';

// 플레이어의 현재 집 레벨을 여러 후보 필드에서 추론(없으면 1)
const getCurrentHouseLevel = (player) => {
  const cand = [player?.houseLevel, player?.house?.level, player?.house?.currentLevel, player?.homeLevel];
  const v = cand.find((x) => x !== undefined && x !== null);
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 1;
};

// HOUSE_LEVEL_MAP에서 level에 해당하는 레벨 객체 찾기
const pickLevelObj = (level) =>
  (HOUSE_LEVEL_MAP || []).find((x) => Number(x.level) === Number(level)) || null;

// characterId로 캐릭터 고유 색상(color) 추출(없으면 null)
const getCharacterColorById = (characterId) => {
  const id = Number(characterId);
  if (!Number.isFinite(id)) return null;
  const c = (Array.isArray(CHARACTERS) ? CHARACTERS : []).find((x) => Number(x?.id) === id) || null;
  const col = c?.color;
  return typeof col === 'string' && col.trim() ? col.trim() : null;
};

// SVG를 mask로 깔고 backgroundColor로 색을 칠하는 아이콘 컴포넌트
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

// lackMessage/contentText에서 "철 1개" 같은 토큰을 뽑아 하이라이트 후보로 사용
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

export default function HouseStep3Upgrade({
                                            player,
                                            isMyTurn,
                                            character,
                                            onBackToNaugul,
                                            onConfirmUpgrade,

                                            hasAllMaterials,
                                            lackMessage,
                                          }) {
  // 말풍선에 사용할 내 이름
  const myName = useMemo(() => getPlayerDisplayName(player), [player]);
  const characterId = player?.characterId;

  // 하이라이트에 쓸 플레이어 색(CHARACTERS의 color 우선, 없으면 props character.color)
  const playerColor = useMemo(
    () => getCharacterColorById(characterId) || character?.color || COLORS.ac.darkBrown,
    [characterId, character?.color],
  );

  // 현재/다음 레벨 계산
  const currentLevel = useMemo(() => getCurrentHouseLevel(player), [player]);
  const nextLevel = currentLevel + 1;

  // 레벨 객체(이름/아이콘/요구치 등) 참조
  const curObj = useMemo(() => pickLevelObj(currentLevel), [currentLevel]);
  const nextObj = useMemo(() => pickLevelObj(nextLevel), [nextLevel]);

  // 표시용 이름(데이터 없을 때 대비)
  const curName = curObj?.name || (currentLevel === 1 ? '땅' : `level ${currentLevel}`);
  const nextName = nextObj?.name || (nextLevel <= 5 ? `level ${nextLevel}` : '최고 레벨');

  // 현재 집/다음 집 아이콘(캐릭터별 houseImage를 고려)
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

  // 다음 레벨이 없으면 최대 레벨로 취급
  const isMaxLevel = !nextObj || nextLevel > 5;

  // 업그레이드 가능 여부(부모가 boolean을 주면 그걸 우선)
  const canUpgrade = typeof hasAllMaterials === 'boolean' ? hasAllMaterials : !isMaxLevel;

  // 말풍선 본문(가능/불가에 따라 분기)
  const defaultLack = `${nextName}으로 업그레이드 하려 왔나구리?\n아직 재료가 더 필요하다구리.`;

  const contentText = canUpgrade
    ? `음... 재료를 다 모아왔구리!\n${nextName}으로 업그레이드를 할 수 있구리.\n집 업그레이드 공사를 진행할까구리?`
    : (lackMessage && String(lackMessage).trim()) || defaultLack;

  // 선택지(가능하면 2개, 불가면 1개)
  const options = canUpgrade
    ? [
      { text: '업그레이드 진행', onClick: () => isMyTurn && onConfirmUpgrade?.() },
      { text: '다음에 할게', onClick: () => isMyTurn && onBackToNaugul?.() },
    ]
    : [{ text: '다음에 할게', onClick: () => isMyTurn && onBackToNaugul?.() }];

  // 하이라이트: 내 이름(캐릭터색) + 다음 집 이름/재료 토큰(nookCyan)
  const resourceTokens = useMemo(() => pickResourceTokens(contentText), [contentText]);

  const highlights = useMemo(() => {
    const hs = [];
    if (myName) hs.push({ text: myName, color: playerColor });
    if (nextName) hs.push({ text: nextName, color: COLORS.ac.nookCyan });
    resourceTokens.forEach((t) => {
      hs.push({ text: t, color: COLORS.ac.nookCyan });
    });
    return hs;
  }, [myName, playerColor, nextName, resourceTokens]);

  // 다음 카드: 잠금이 아닐 때만 청록 틴트 배경 적용
  const nextCardStyle = canUpgrade
    ? {
      backgroundColor: withAlpha(COLORS.ac.nookCyan, 0.35),
    }
    : undefined;

  return (
    <>
      <div className="houseUpgPanel">
        <div className="houseUpgTitle">업그레이드 안내서</div>

        <div className="houseUpgRow">
          {/* 현재 집 카드 */}
          <div className="houseUpgCard">
            <div className="houseUpgLevelBox">{curName}</div>

            <div className="houseUpgImgBox">
              {curIcon ? (
                <img className="houseUpgHouseImg" src={curIcon} alt="cur-house" draggable={false} />
              ) : null}
            </div>
          </div>

          {/* 가운데 화살표(white) */}
          <MaskIcon
            src={ICON.arrow}
            sizePx={{ w: 102, h: 32 }}
            color={COLORS.ac.white}
            className="houseUpgArrow"
          />

          {/* 다음 집 카드(잠금이면 lock 표시) */}
          <div className="houseUpgCard houseUpgCardNext" style={nextCardStyle}>
            <div className="houseUpgLevelBox">{nextName}</div>

            <div className="houseUpgImgBox">
              {!canUpgrade ? (
                <div className="houseUpgLockedWrap">
                  {/* 흐릿한 집 실루엣(다음 아이콘 없으면 현재 아이콘으로 대체) */}
                  {nextIcon ? (
                    <img
                      className="houseUpgLockedHouseGhost"
                      src={nextIcon}
                      alt="ghost-house"
                      draggable={false}
                    />
                  ) : curIcon ? (
                    <img
                      className="houseUpgLockedHouseGhost"
                      src={curIcon}
                      alt="ghost-house"
                      draggable={false}
                    />
                  ) : null}

                  {/* 잠금 아이콘(yellow) */}
                  <MaskIcon
                    src={ICON.lock}
                    sizePx={252}
                    color={COLORS.ac.yellow}
                    className="houseUpgLock"
                  />
                </div>
              ) : nextIcon ? (
                <img className="houseUpgHouseImg" src={nextIcon} alt="next-house" draggable={false} />
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* 너굴 말풍선(본문 + 옵션 + 하이라이트) */}
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
