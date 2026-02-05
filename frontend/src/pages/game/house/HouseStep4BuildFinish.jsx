import React, { useEffect, useMemo, useState } from 'react';
import Subtitle from '../../../components/common/Subtitle.jsx';
import AutoMove from '../../../components/common/AutoMove.jsx';
import { COLORS } from '../../../constants/colors.js';
import { HOUSE_LEVEL_MAP, getHouseIconByLevel, normalizeHouseLevelByAny, roEuro } from '../../../constants/houseLevel.js';
import { useGameTimer } from '../../../hooks/useGameTimer.js';
import './HouseStep4BuildFinish.css';

const IMG = {
  ui: '/images/board/ui-buildhouse.webp',
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

// 대사 길이에 따라 "대략" 노출 시간(ms) 추정 (초 단위 훅에 맞게 나중에 ceil 처리)
const estimateTypingMs = (text) => {
  const s = String(text ?? '');
  const len = s.replace(/\s+/g, '').length;

  const base = 500;
  const perChar = 70;
  const ms = base + len * perChar;

  return Math.max(1800, Math.min(9000, ms));
};

export default function HouseStep4BuildFinish({
                                                player,
                                                character,
                                                onAutoNext,
                                                afterTypedMs = 2000,
                                                afterHideMs = 3000,
                                              }) {
  const myName = useMemo(() => getPlayerDisplayName(player), [player]);
  const characterId = player?.characterId;
  const curLevel = useMemo(() => getCurrentHouseLevel(player), [player]);

  const curLevelObj = useMemo(() => {
    return (HOUSE_LEVEL_MAP || []).find((x) => Number(x?.level) === Number(curLevel)) || null;
  }, [curLevel]);

  const houseName = curLevelObj?.name || '집';
  const houseSrc = useMemo(() => {
    return getHouseIconByLevel(curLevel, characterId) || '';
  }, [curLevel, characterId]);

  // 너굴 대사(집 이름 조사 반영)
  const contentText = `${houseName}${roEuro(houseName)} 공사를 진행하겠다구리!\n돌아가면 멋진 집이 완성되어있을거라구리`;

  // 하이라이트(집 이름, 플레이어 이름)
  const highlights = useMemo(
    () => [
      { text: houseName, color: COLORS.ac.nookCyan },
      { text: myName, color: character?.color || COLORS.ac.darkBrown },
    ],
    [houseName, myName, character?.color],
  );

  // 단계: 1) 대사 노출 → 2) 숨김 → 3) 자동 이동
  const [phase, setPhase] = useState('SHOW'); // SHOW | HIDE

  useEffect(() => {
    // 텍스트가 바뀌면 항상 처음부터
    setPhase('SHOW');
  }, [contentText]);

  // 1) SHOW 단계 시간(초)
  const showMs = useMemo(() => {
    const typingMs = estimateTypingMs(contentText);
    return typingMs + Math.max(0, Number(afterTypedMs) || 0);
  }, [contentText, afterTypedMs]);

  const showSeconds = useMemo(() => Math.max(1, Math.ceil(showMs / 1000)), [showMs]);
  const hideSeconds = useMemo(() => Math.max(1, Math.ceil(Math.max(0, Number(afterHideMs) || 0) / 1000)), [afterHideMs]);

  useGameTimer(phase === 'SHOW' ? showSeconds : 0, () => {
    setPhase('HIDE');
  });

  useGameTimer(phase === 'HIDE' ? hideSeconds : 0, () => {
    onAutoNext?.();
  });

  const showSubtitle = phase === 'SHOW';

  return (
    <div className="houseStep4Root">
      <img src={IMG.ui} alt="" draggable={false} className="houseStep4Ui" />

      {/* 자동 이동 안내 */}
      <AutoMove />

      {/* 타이틀 영역(PSD 좌표: UI 기준) */}
      <div
        className="houseStep4TitleBox"
        style={{
          left: 'calc(var(--uiOffsetX) + (60 * var(--s)))',
          top: 'calc(var(--uiOffsetY) + (188 * var(--s)))',
          width: 'calc(280 * var(--s))',
          height: 'calc(140 * var(--s))',
        }}
      >
        <div className="houseStep4Title" style={{ color: COLORS.ac.grass }}>
          {myName}의
          <br />
          {houseName}
        </div>
      </div>

      {/* 집 이미지 영역(PSD 좌표: UI 기준) */}
      <div
        className="houseStep4ImageBox"
        style={{
          top: 'calc(var(--uiOffsetY) + (188 * var(--s)))',
          width: 'calc(600 * var(--s))',
          height: 'calc(500 * var(--s))',
        }}
      >
        {!!houseSrc && <img src={houseSrc} alt="house" draggable={false} className="houseStep4HouseImg" />}
      </div>

      {/* 너굴 대사 */}
      {showSubtitle && (
        <Subtitle
          nameText="너굴"
          nameColor={COLORS.characters.naugul.nameBox}
          nameTextColor={COLORS.characters.naugul.nameText}
          contentText={contentText}
          highlights={highlights}
          options={[]}
          optionDisabled
        />
      )}
    </div>
  );
}
