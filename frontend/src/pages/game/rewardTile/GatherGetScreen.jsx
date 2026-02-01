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

// 텍스트 안전 처리: 빈값/템플릿 문자열이면 fallback 사용
const safeText = (v, fallback = '') => {
  const s = String(v ?? '').trim();
  if (!s) return fallback;
  if (s.includes('${')) return fallback;
  return s;
};

// 보상 key로 이미지 src 조회(없으면 빈 문자열)
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

                                          nextHouseLevelText,
                                          playerNameText,

                                          viewerNameText,
                                          viewerHouseLevel,
                                          viewerNameColor = '#FFFFFF',
                                        }) {
  const [k1, k2] = dropKeys;

  // 보상 이름(한글)
  const aName = useMemo(() => koName(k1), [k1]);
  const bName = useMemo(() => koName(k2), [k2]);

  // 자막 2번째 줄 + 하이라이트용 토큰(집 이름/관전자 이름)
  const { subLine, nextLevelNameForHighlight, viewerNameForHighlight } = useMemo(() => {
    const viewerName = safeText(viewerNameText, nickname) || '나';

    // 과일: 관전자 이름 + 조사로 문장 구성
    if (kind === 'fruit') {
      return {
        subLine: `${viewerName}${iGa(viewerName)} 뺏어가지 않게 주머니에 잘 넣어두자!`,
        nextLevelNameForHighlight: '',
        viewerNameForHighlight: viewerName,
      };
    }

    // 재화: 다음 집 레벨에 필요한 재료인지 판정
    const { nextLevel, isNeeded } = isAnyRewardNeededForNextLevel(
      viewerHouseLevel,
      [k1, k2].filter(Boolean),
    );

    // 다음 레벨이 없으면 일반 문구
    if (!nextLevel) {
      return {
        subLine: `집에 필요한 재료네!`,
        nextLevelNameForHighlight: '',
        viewerNameForHighlight: '',
      };
    }

    // 다음 레벨 이름은 하이라이트 대상으로 사용
    const line = isNeeded
      ? `${nextLevel.name}에 필요한 재료네!`
      : `${nextLevel.name}에 필요한 재료는 아니네..`;

    return {
      subLine: line,
      nextLevelNameForHighlight: nextLevel.name,
      viewerNameForHighlight: '',
    };
  }, [kind, viewerNameText, nickname, viewerHouseLevel, k1, k2]);

  // 자막 본문(줄바꿈 포함)
  const contentText = useMemo(() => `${mainLine}\n${subLine}`, [mainLine, subLine]);

  // Subtitle 하이라이트 목록(본문에 실제로 들어가는 문자열만 넣기)
  const highlights = useMemo(() => {
    const list = [];
    const blue = COLORS?.ac?.dialogBlue || '#34c4d3';

    // 보상 이름 하이라이트(조사 제외, 순수 이름만)
    if (aName) list.push({ text: aName, color: blue });
    if (bName) list.push({ text: bName, color: blue });

    // 과일이면 관전자 이름 하이라이트
    if (kind === 'fruit' && viewerNameForHighlight) {
      list.push({ text: viewerNameForHighlight, color: viewerNameColor });
    }

    // 재화면 집 이름 하이라이트
    if (kind === 'resource' && nextLevelNameForHighlight) {
      list.push({ text: nextLevelNameForHighlight, color: COLORS.primary });
    }

    return list;
  }, [aName, bName, kind, viewerNameForHighlight, viewerNameColor, nextLevelNameForHighlight]);

  // Complete 단계에서 캐릭터를 살짝 위로 올리는 값(현재 뷰포트 비율 기준)
  const completeY = useMemo(() => -200 * (window.innerHeight / 1080), []);

  // 상단 슬롯 고정 키(드랍 완료 후/Complete에서 유지용)
  const fixedLeftKey = topKeys?.[0] || null;
  const fixedRightKey = topKeys?.[1] || null;

  // 드랍용 이미지 src(좌/우)
  const leftSrc = getRewardSrc(k1);
  const rightSrc = getRewardSrc(k2);

  // 좌측 드랍 도착 콜백(부모에서 fixedKeys 채우게 함)
  const handleArriveLeft = useCallback(() => {
    if (!k1) return;
    onDropOneDone?.({ index: 0, key: k1 });
  }, [k1, onDropOneDone]);

  // 우측 드랍 도착 콜백(부모에서 fixedKeys 채우게 함)
  const handleArriveRight = useCallback(() => {
    if (!k2) return;
    onDropOneDone?.({ index: 1, key: k2 });
  }, [k2, onDropOneDone]);

  return (
    <>
      {/* Complete 단계 안내 문구 */}
      {showSubtitle ? (
        <div className="gather-top-pill" aria-hidden="true">
          잠시후 자동으로 이동합니다...
        </div>
      ) : null}

      {/* 상단 보상 슬롯 2개(드랍 or 고정 표시) */}
      <div className="gather-top-items" aria-hidden="true">
        {/* LEFT SLOT */}
        <div className="gather-item-box">
          {/* 고정 표시(드랍 완료 후/Complete에서 유지) */}
          {fixedLeftKey ? (
            <div className="gather-item-inner">
              {getRewardSrc(fixedLeftKey) ? (
                <img className="gather-item-img" src={getRewardSrc(fixedLeftKey)} alt="" draggable={false} />
              ) : null}
            </div>
          ) : null}

          {/* 드랍 애니메이션(고정 키가 없을 때만) */}
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
          {/* 고정 표시(드랍 완료 후/Complete에서 유지) */}
          {fixedRightKey ? (
            <div className="gather-item-inner">
              {getRewardSrc(fixedRightKey) ? (
                <img className="gather-item-img" src={getRewardSrc(fixedRightKey)} alt="" draggable={false} />
              ) : null}
            </div>
          ) : null}

          {/* 드랍 애니메이션(고정 키가 없을 때만) */}
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

      {/* 캐릭터(Complete 단계에서만 위로 살짝 이동) */}
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

      {/* 자막(Complete 단계에서만 표시) */}
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
