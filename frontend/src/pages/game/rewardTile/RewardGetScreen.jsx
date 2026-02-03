import React, { useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import Subtitle from '../../../components/common/Subtitle.jsx';
import { koName, rewardImageSrc, waGwa, iGa } from '../../../constants/reward.js';
import { isAnyRewardNeededForNextLevel } from '../../../constants/houseLevel.js';
import { COLORS } from '../../../constants/colors.js';

// 사용자/뷰어 이름 등 외부 입력 텍스트를 안전하게 정리(빈값/템플릿 문자열 방지)
const safeText = (v, fallback = '') => {
  const s = String(v ?? '').trim();
  if (!s) return fallback;
  if (s.includes('${')) return fallback;
  return s;
};

// 보상 key로 이미지 src를 안전하게 가져오기
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
  // 떨어지는 보상(최대 2개) 키
  const [k1, k2] = dropKeys;

  // 보상 한글 이름(없으면 빈 문자열)
  const aName = useMemo(() => koName(k1), [k1]);
  const bName = useMemo(() => koName(k2), [k2]);

  // 말풍선 첫 줄(획득 문구)
  const mainLine = useMemo(() => {
    const prefix = '야호';
    if (aName && bName) return `${prefix} ${aName}${waGwa(aName)} ${bName}를 획득했다!`;
    return `${prefix} 보상을 획득했다!`;
  }, [aName, bName]);

  // 말풍선 둘째 줄 + 하이라이트용 텍스트(상황별 분기)
  const { subLine, nextLevelNameForHighlight, viewerNameForHighlight } = useMemo(() => {
    const viewerName = safeText(viewerNameText, nickname) || '나';

    // 과일(훔치기 방지) 전용 문구
    if (kind === 'fruit') {
      return {
        subLine: `${viewerName}${iGa(viewerName)} 뺏어가지 않게 주머니에 잘 넣어두자!`,
        nextLevelNameForHighlight: '',
        viewerNameForHighlight: viewerName,
      };
    }

    // 재화(resource): 다음 레벨에 필요한 재료인지 판단
    const { nextLevel, isNeeded } = isAnyRewardNeededForNextLevel(
      viewerHouseLevel,
      [k1, k2].filter(Boolean),
    );

    // 다음 레벨이 없으면(최대 레벨 등) 기본 문구
    if (!nextLevel) {
      return {
        subLine: '집에 필요한 재료네!',
        nextLevelNameForHighlight: '',
        viewerNameForHighlight: '',
      };
    }

    // 필요한 재료면 긍정, 아니면 부정 문구
    const line = isNeeded
      ? `${nextLevel.name}에 필요한 재료네!`
      : `${nextLevel.name}에 필요한 재료는 아니네..`;

    return {
      subLine: line,
      nextLevelNameForHighlight: nextLevel.name,
      viewerNameForHighlight: '',
    };
  }, [kind, viewerNameText, nickname, viewerHouseLevel, k1, k2]);

  // Subtitle에 들어갈 최종 텍스트(2줄)
  const contentText = useMemo(() => `${mainLine}\n${subLine}`, [mainLine, subLine]);

  // 하이라이트(보상 이름/뷰어 이름/다음 레벨 이름)
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

  // 자막이 뜰 때 캐릭터를 위로 살짝 올리는 목표 y
  const completeY = 'calc(-200 * (1cqh / 10.8))';

  // 상단 슬롯에 "고정"되어 이미 들어간 보상 키(왼/오)
  const fixedLeftKey = topKeys?.[0] || null;
  const fixedRightKey = topKeys?.[1] || null;

  // 현재 드랍될 보상 이미지 src(없으면 빈 문자열)
  const leftSrc = getRewardSrc(k1);
  const rightSrc = getRewardSrc(k2);

  // 왼쪽 드랍 애니메이션 완료 콜백(서버/상태로 "1개 도착" 알림)
  const handleArriveLeft = useCallback(() => {
    if (!k1) return;
    onDropOneDone?.({ index: 0, key: k1 });
  }, [k1, onDropOneDone]);

  // 오른쪽 드랍 애니메이션 완료 콜백
  const handleArriveRight = useCallback(() => {
    if (!k2) return;
    onDropOneDone?.({ index: 1, key: k2 });
  }, [k2, onDropOneDone]);

  /**
   * Subtitle 렌더 값 스냅샷 고정:
   * - showSubtitle이 켜지는 순간 name/content/highlights를 저장
   * - 타이핑 중간 외부 state 변화로 텍스트가 바뀌는 현상 방지
   */
  const snapRef = useRef({
    nameText: '',
    nameColor: undefined,
    nameTextColor: '#FFFFFF',
    contentText: '',
    highlights: [],
  });

  // showSubtitle의 직전 값을 기억해서 "false -> true" 순간만 감지
  const prevShowSubtitleRef = useRef(false);

  useEffect(() => {
    const was = prevShowSubtitleRef.current;
    prevShowSubtitleRef.current = showSubtitle;

    // 처음 자막이 켜질 때만 스냅샷 세팅
    if (!was && showSubtitle) {
      snapRef.current = {
        nameText: nickname || '',
        nameColor,
        nameTextColor: '#FFFFFF',
        contentText,
        highlights,
      };
    }

    // 자막이 꺼질 때 스냅샷 초기화(다음 사이클 대비)
    if (was && !showSubtitle) {
      snapRef.current = {
        nameText: '',
        nameColor: undefined,
        nameTextColor: '#FFFFFF',
        contentText: '',
        highlights: [],
      };
    }
  }, [showSubtitle, nickname, nameColor, contentText, highlights]);

  const snap = snapRef.current;

  return (
    <>
      {/* 자막 노출 중 상단 안내 pill */}
      {showSubtitle ? (
        <div className="reward-top-pill" aria-hidden="true">
          잠시후 자동으로 이동합니다...
        </div>
      ) : null}

      {/* 상단 보상 슬롯(고정 아이템 or 떨어지는 애니메이션) */}
      <div className="reward-top-items" aria-hidden="true">
        <div className="reward-item-box">
          {fixedLeftKey ? (
            <div className="reward-item-inner">
              {getRewardSrc(fixedLeftKey) ? (
                <img className="reward-item-img" src={getRewardSrc(fixedLeftKey)} alt="" draggable={false} />
              ) : null}
            </div>
          ) : null}

          {/* 떨어지는 연출(좌) - 이미 고정 아이템이 있으면 생략 */}
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

          {/* 떨어지는 연출(우) - 딜레이로 약간 어긋나게 */}
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

      {/* 하단 캐릭터(자막 뜨면 위로 이동) */}
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

      {/* Subtitle(스냅샷 값으로 렌더) */}
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
              className="reward-subtitle"
              nameText={snap.nameText}
              nameColor={snap.nameColor}
              nameTextColor={snap.nameTextColor}
              contentText={snap.contentText}
              highlights={snap.highlights}
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
