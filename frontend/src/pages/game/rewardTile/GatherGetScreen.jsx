// src/pages/game/gather/GatherGetScreen.jsx
import React, { useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import Subtitle from '../../../components/common/Subtitle.jsx';
import {
  koName,
  rewardImageSrc,
  waGwa,
  eulReul,
  iGa,
} from '../../../constants/gatherReward.js';
import { isAnyRewardNeededForNextLevel } from '../../../constants/houseLevel.js';
import { COLORS } from '../../../constants/colors.js';

const safeText = (v, fallback = '') => {
  const s = String(v ?? '').trim();
  if (!s) return fallback;
  if (s.includes('${')) return fallback;
  return s;
};

const getRewardSrc = (key) => {
  if (!key) return '';
  const src = rewardImageSrc(key);
  return typeof src === 'string' ? src : '';
};

export default function GatherGetScreen({
                                          kind,
                                          nickname,
                                          nameColor,
                                          characterImage,

                                          dropKeys = [],
                                          topKeys = [],

                                          showSubtitle = false,
                                          showDrop = false,
                                          dropRunId = 0,
                                          onDropOneDone,

                                          // (유지)
                                          nextHouseLevelText,
                                          playerNameText,

                                          // viewer(관전/플레이 중인 나)
                                          viewerNameText,
                                          viewerHouseLevel,
                                          viewerNameColor = '#FFFFFF',
                                        }) {
  const [k1, k2] = dropKeys;

  // 아이템 이름(koName)
  const aName = useMemo(() => koName(k1), [k1]);
  const bName = useMemo(() => koName(k2), [k2]);

  /**
   * ✅ 화면에 실제로 찍히는 "표시 토큰"(조사 포함)
   * - Subtitle 하이라이트가 "단어 단위" 매칭이면 이게 중요함.
   */

  // 2줄: 과일이면 "{viewer}이/가 ..." / 재화면 "{집(1)}에 필요한 재료네!"(집 이름은 primary 하이라이트)
  const { subLine, nextLevelNameForHighlight, viewerNameForHighlight } = useMemo(() => {
    const viewerName = safeText(viewerNameText, nickname) || '나';

    if (kind === 'fruit') {
      return {
        subLine: `${viewerName}${iGa(viewerName)} 뺏어가지 않게 주머니에 잘 넣어두자!`,
        nextLevelNameForHighlight: '',
        viewerNameForHighlight: viewerName,
      };
    }

    const { nextLevel, isNeeded } = isAnyRewardNeededForNextLevel(
      viewerHouseLevel,
      [k1, k2].filter(Boolean),
    );

    if (!nextLevel) {
      return {
        subLine: `집에 필요한 재료네!`,
        nextLevelNameForHighlight: '',
        viewerNameForHighlight: '',
      };
    }

    const line = isNeeded
      ? `${nextLevel.name}에 필요한 재료네!`
      : `${nextLevel.name}에 필요한 재료는 아니네..`;

    return {
      subLine: line,
      nextLevelNameForHighlight: nextLevel.name,
      viewerNameForHighlight: '',
    };
  }, [kind, viewerNameText, nickname, viewerHouseLevel, k1, k2]);

  // 타이핑용 텍스트
  const contentText = useMemo(() => `${mainLine}\n${subLine}`, [mainLine, subLine]);

  /**
   * ✅ 하이라이트 텍스트도 "실제로 contentText 안에 들어있는 문자열"로 넣기
   * - 2개일 때: tokenA="철광석과", tokenB="천을"
   * - 1개일 때: tokenA="철광석을"
   */
  const highlights = useMemo(() => {
    const list = [];
    const blue = COLORS?.ac?.dialogBlue || '#34c4d3';

    // ✅ 조사 없는 "아이템명"만 칠하기
    if (aName) list.push({ text: aName, color: blue });
    if (bName) list.push({ text: bName, color: blue });

    // ✅ 과일일 때 관전자 이름 하이라이트는 그대로
    if (kind === 'fruit' && viewerNameForHighlight) {
      list.push({ text: viewerNameForHighlight, color: viewerNameColor });
    }

    // ✅ 재화일 때 집 이름 하이라이트는 그대로
    if (kind === 'resource' && nextLevelNameForHighlight) {
      list.push({ text: nextLevelNameForHighlight, color: COLORS.primary });
    }

    return list;
  }, [aName, bName, kind, viewerNameForHighlight, viewerNameColor, nextLevelNameForHighlight]);

  const completeY = useMemo(() => -200 * (window.innerHeight / 1080), []);

  const fixedLeftKey = topKeys?.[0] || null;
  const fixedRightKey = topKeys?.[1] || null;

  const leftSrc = getRewardSrc(k1);
  const rightSrc = getRewardSrc(k2);

  const handleArriveLeft = useCallback(() => {
    if (!k1) return;
    onDropOneDone?.({ index: 0, key: k1 });
  }, [k1, onDropOneDone]);

  const handleArriveRight = useCallback(() => {
    if (!k2) return;
    onDropOneDone?.({ index: 1, key: k2 });
  }, [k2, onDropOneDone]);

  return (
    <>
      {showSubtitle ? (
        <div className="gather-top-pill" aria-hidden="true">
          잠시후 자동으로 이동합니다...
        </div>
      ) : null}

      {/* 상단 슬롯 */}
      <div className="gather-top-items" aria-hidden="true">
        {/* LEFT SLOT */}
        <div className="gather-item-box">
          {fixedLeftKey ? (
            <div className="gather-item-inner">
              {getRewardSrc(fixedLeftKey) ? (
                <img className="gather-item-img" src={getRewardSrc(fixedLeftKey)} alt="" draggable={false} />
              ) : null}
            </div>
          ) : null}

          {showDrop && !fixedLeftKey && leftSrc ? (
            <motion.div
              key={`dropwrap-${dropRunId}-L-${k1}`}
              className="slot-drop-wrap"
              initial={{ y: -240, opacity: 1 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
              onAnimationComplete={handleArriveLeft}
            >
              <img className="gather-item-img" src={leftSrc} alt="" draggable={false} />
            </motion.div>
          ) : null}
        </div>

        {/* RIGHT SLOT */}
        <div className="gather-item-box">
          {fixedRightKey ? (
            <div className="gather-item-inner">
              {getRewardSrc(fixedRightKey) ? (
                <img className="gather-item-img" src={getRewardSrc(fixedRightKey)} alt="" draggable={false} />
              ) : null}
            </div>
          ) : null}

          {showDrop && !fixedRightKey && rightSrc ? (
            <motion.div
              key={`dropwrap-${dropRunId}-R-${k2}`}
              className="slot-drop-wrap"
              initial={{ y: -240, opacity: 1 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.9, delay: 0.14, ease: [0.2, 0.8, 0.2, 1] }}
              onAnimationComplete={handleArriveRight}
            >
              <img className="gather-item-img" src={rightSrc} alt="" draggable={false} />
            </motion.div>
          ) : null}
        </div>
      </div>

      {/* 캐릭터 */}
      <div className="gather-character-wrap" aria-hidden="true">
        <motion.div
          className="gather-character-box"
          animate={{ y: showSubtitle ? completeY : 0 }}
          transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
        >
          {characterImage ? (
            <img className="gather-character-img" src={characterImage} alt="" draggable={false} />
          ) : null}
        </motion.div>
      </div>

      {/* 자막 */}
      <AnimatePresence>
        {showSubtitle ? (
          <motion.div
            key="subtitle"
            className="gather-dialog-wrap"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <Subtitle
              nameText={nickname}
              nameColor={nameColor}
              nameTextColor="#FFFFFF"
              contentText={contentText}
              highlights={highlights}
              options={[]}
              showTriangle={false}
              typingSpeed={30}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
