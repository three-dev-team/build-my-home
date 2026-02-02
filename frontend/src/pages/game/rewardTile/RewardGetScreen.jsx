import React, { useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import Subtitle from '../../../components/common/Subtitle.jsx';
import { koName, rewardImageSrc, waGwa, iGa } from '../../../constants/reward.js';
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

export default function RewardGetScreen({
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

                                          viewerNameText,
                                          viewerHouseLevel,
                                          viewerNameColor = '#FFFFFF',
                                        }) {
  const [k1, k2] = dropKeys;

  const aName = useMemo(() => koName(k1), [k1]);
  const bName = useMemo(() => koName(k2), [k2]);

  const mainLine = useMemo(() => {
    const prefix = '야호';
    if (aName && bName) return `${prefix} ${aName}${waGwa(aName)} ${bName}를 획득했다!`;
    return `${prefix} 보상을 획득했다!`;
  }, [aName, bName]);

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
        subLine: '집에 필요한 재료네!',
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

  const contentText = useMemo(() => `${mainLine}\n${subLine}`, [mainLine, subLine]);

  const highlights = useMemo(() => {
    const list = [];
    const blue = COLORS?.ac?.dialogBlue || '#34c4d3';

    if (aName) list.push({ text: aName, color: blue });
    if (bName) list.push({ text: bName, color: blue });

    if (kind === 'fruit' && viewerNameForHighlight) {
      list.push({ text: viewerNameForHighlight, color: viewerNameColor });
    }

    if (kind === 'resource' && nextLevelNameForHighlight) {
      list.push({ text: nextLevelNameForHighlight, color: COLORS.primary });
    }

    return list;
  }, [aName, bName, kind, viewerNameForHighlight, viewerNameColor, nextLevelNameForHighlight]);

  const completeY = 'calc(-200 * (1cqh / 10.8))';

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
        <div className="reward-top-pill" aria-hidden="true">
          잠시후 자동으로 이동합니다...
        </div>
      ) : null}

      <div className="reward-top-items" aria-hidden="true">
        <div className="reward-item-box">
          {fixedLeftKey ? (
            <div className="reward-item-inner">
              {getRewardSrc(fixedLeftKey) ? (
                <img className="reward-item-img" src={getRewardSrc(fixedLeftKey)} alt="" draggable={false} />
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
              <img className="reward-item-img" src={leftSrc} alt="" draggable={false} />
            </motion.div>
          ) : null}
        </div>

        <div className="reward-item-box">
          {fixedRightKey ? (
            <div className="reward-item-inner">
              {getRewardSrc(fixedRightKey) ? (
                <img className="reward-item-img" src={getRewardSrc(fixedRightKey)} alt="" draggable={false} />
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
              <img className="reward-item-img" src={rightSrc} alt="" draggable={false} />
            </motion.div>
          ) : null}
        </div>
      </div>

      <div className="reward-character-wrap" aria-hidden="true">
        <motion.div
          className="reward-character-box"
          animate={{ y: showSubtitle ? completeY : 0 }}
          transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
        >
          {characterImage ? (
            <img className="reward-character-img" src={characterImage} alt="" draggable={false} />
          ) : null}
        </motion.div>
      </div>

      <AnimatePresence>
        {showSubtitle ? (
          <motion.div
            key="subtitle"
            className="reward-dialog-wrap"
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
