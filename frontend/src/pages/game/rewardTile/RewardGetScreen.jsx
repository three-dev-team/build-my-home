import React, { useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import Subtitle from '../../../components/common/Subtitle.jsx';
import AutoMove from '../../../components/common/AutoMove.jsx';
import { koName, rewardImageSrc, waGwa, iGa } from '../../../constants/reward.js';
import { isAnyRewardNeededForNextLevel } from '../../../constants/houseLevel.js';
import { COLORS } from '../../../constants/colors.js';
import Shadow from '../../../components/common/Shadow.jsx';

// 보상 key -> 이미지 src
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
                                          viewerNameColor,
                                          viewerOwnedResources = {},
                                        }) {
  const [k1, k2] = dropKeys;

  const aName = useMemo(() => (k1 ? koName(k1) : ''), [k1]);
  const bName = useMemo(() => (k2 ? koName(k2) : ''), [k2]);

  // 메인 문구(획득)
  const mainLine = useMemo(() => {
    const prefix = '야호';
    if (aName && bName) return `${prefix} ${aName}${waGwa(aName)} ${bName}를 획득했다!`;
    if (aName) return `${prefix} ${aName}를 획득했다!`;
    if (bName) return `${prefix} ${bName}를 획득했다!`;
    return `${prefix} 보상을 획득했다!`;
  }, [aName, bName]);

  // 관전자 이름(없으면 빈 문자열)
  const viewerName = useMemo(() => String(viewerNameText ?? '').trim(), [viewerNameText]);
  const { subLine, nextLevelNameForHighlight, viewerNameForHighlight } = useMemo(() => {
    if (kind === 'fruit') {
      const line = viewerName
        ? `${viewerName}${iGa(viewerName)} 뺏어가지 않게 주머니에 잘 넣어두자!`
        : '뺏어가지 않게 주머니에 잘 넣어두자!';

      return {
        subLine: line,
        nextLevelNameForHighlight: '',
        viewerNameForHighlight: viewerName,
      };
    }

    // resource
    const { nextLevel, isNeeded } = isAnyRewardNeededForNextLevel(viewerHouseLevel, dropKeys, viewerOwnedResources);

    if (!nextLevel) {
      return {
        subLine: '집에 필요한 재료네!',
        nextLevelNameForHighlight: '',
        viewerNameForHighlight: '',
      };
    }

    const line = isNeeded ? `${nextLevel.name}에 필요한 재료네!` : `${nextLevel.name}에 필요한 재료는 아니네..`;

    return {
      subLine: line,
      nextLevelNameForHighlight: nextLevel.name,
      viewerNameForHighlight: '',
    };
  }, [kind, viewerName, viewerHouseLevel, dropKeys, viewerOwnedResources]);

  // Subtitle 본문(2줄)
  const contentText = useMemo(() => `${mainLine}\n${subLine}`, [mainLine, subLine]);

  // 하이라이트(보상/이름/다음 집)
  const highlights = useMemo(() => {
    const list = [];
    const rewardHighlightColor = COLORS.ac.nookCyan;

    if (aName) list.push({ text: aName, color: rewardHighlightColor });
    if (bName) list.push({ text: bName, color: rewardHighlightColor });

    if (kind === 'fruit' && viewerNameForHighlight && viewerNameColor) {
      list.push({ text: viewerNameForHighlight, color: viewerNameColor });
    }

    if (kind === 'resource' && nextLevelNameForHighlight) {
      list.push({ text: nextLevelNameForHighlight, color: COLORS.primary });
    }

    return list;
  }, [aName, bName, kind, viewerNameForHighlight, viewerNameColor, nextLevelNameForHighlight]);

  // Subtitle 표시 시 캐릭터 위로 올리기(오프셋)
  const completeY = 'calc(-200 * (1cqh / 10.8))';

  // 상단 슬롯 고정 키
  const fixedLeftKey = topKeys?.[0] || null;
  const fixedRightKey = topKeys?.[1] || null;

  // 드랍 이미지 src
  const leftSrc = getRewardSrc(k1);
  const rightSrc = getRewardSrc(k2);

  // 드랍 도착 콜백(슬롯 고정 반영)
  const handleArriveLeft = useCallback(() => {
    if (!k1) return;
    onDropOneDone?.({ index: 0, key: k1 });
  }, [k1, onDropOneDone]);

  const handleArriveRight = useCallback(() => {
    if (!k2) return;
    onDropOneDone?.({ index: 1, key: k2 });
  }, [k2, onDropOneDone]);

  // Subtitle 스냅샷(애니메이션 동안 텍스트 고정)
  const snapRef = useRef({
    nameText: '',
    nameColor: undefined,
    nameTextColor: COLORS.ac.white,
    contentText: '',
    highlights: [],
  });

  const prevShowSubtitleRef = useRef(false);

  useEffect(() => {
    const was = prevShowSubtitleRef.current;
    prevShowSubtitleRef.current = showSubtitle;

    if (!was && showSubtitle) {
      snapRef.current = {
        nameText: String(nickname ?? '').trim(),
        nameColor,
        nameTextColor: COLORS.ac.white,
        contentText,
        highlights,
      };
      return;
    }

    if (was && !showSubtitle) {
      snapRef.current = {
        nameText: '',
        nameColor: undefined,
        nameTextColor: COLORS.ac.white,
        contentText: '',
        highlights: [],
      };
    }
  }, [showSubtitle, nickname, nameColor, contentText, highlights]);

  const snap = snapRef.current;

  return (
    <>
      {showSubtitle ? <AutoMove /> : null}

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
            <Shadow fill={true}>
              <img className="reward-character-img" src={characterImage} alt="" draggable={false} />
            </Shadow>
          ) : null}
        </motion.div>
      </div>

      <AnimatePresence>
        {showSubtitle ? (
          <motion.div
            key="subtitle"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <Subtitle
              nameText={snap.nameText}
              nameColor={snap.nameColor}
              nameTextColor={snap.nameTextColor}
              contentText={snap.contentText}
              highlights={snap.highlights}
              options={[]}
              showTriangle={false}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
