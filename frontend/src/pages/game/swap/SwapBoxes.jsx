// SwapBoxes.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { CHARACTERS } from '../../../constants/characters.js';
import useSpaceKey from '../../../hooks/useSpaceKey.js';
import './Swap.css';
import Shadow from '../../../components/common/Shadow.jsx';

const CATEGORIES = ['HOUSE', 'BELL', 'RESOURCE', 'LOAN'];
const DIRECTIONS = ['TO_RIGHT', 'TO_LEFT', 'EXCHANGE'];

// 룰렛 인덱스 계산 (서버 시간 동기화)
const computeIndex = (startAt, now, cycleMs, len) => {
  if (!startAt || startAt <= 0 || !cycleMs || cycleMs <= 0 || !len) return 0;
  const elapsed = Math.max(0, now - startAt);
  return Math.floor(elapsed / cycleMs) % len;
};

// 카테고리+방향 조합으로 이미지 경로 반환
const getCenterIcon = (category, direction) => {
  const cat = category.toLowerCase();
  const dir = direction === 'EXCHANGE' ? 'exchange' : direction === 'TO_RIGHT' ? 'to-right' : 'to-left';
  return `/images/swap/ui-swap-${cat}-${dir}.webp`;
};

/**
 * @param {string} activeBox - 현재 룰렛 활성화된 박스 ('player1' | 'player2' | 'arrow' | null)
 * @param {boolean} isMyTurn - 내 턴 여부
 * @param {object} player - 현재 플레이어 상태
 * @param {array} players - 전체 플레이어 목록
 * @param {object} swapData - actionDataStr 파싱된 객체
 * @param {function} onBoxClick - 박스 클릭 핸들러 (SelectCategory에서 사용)
 * @param {function} onConfirm - 룰렛 확정 핸들러
 */
export default function SwapBoxes({
  activeBox = null,
  isMyTurn = false,
  players = [],
  swapData = {},
  onBoxClick,
  onConfirm,
}) {
  const [nowMs, setNowMs] = useState(Date.now());
  const rafRef = useRef(null);

  // 선택된 값들 (백엔드에서 저장한 값, 존재한다면 = 선택완료, 선택되기 전까진 null)
  const selectedPlayer1Id = swapData.player1Id || null;
  const selectedPlayer2Id = swapData.player2Id || null;
  const selectedCategory = swapData.category || null;
  const selectedDirection = swapData.direction || null;

  // 랜덤 초기값 (SelectCategory에서 사용)
  const [randomPlayer1Index] = useState(() => Math.floor(Math.random() * Math.max(1, players.length)));
  const [randomPlayer2Index] = useState(() => Math.floor(Math.random() * Math.max(1, players.length)));
  const [randomArrowIndex] = useState(() => Math.floor(Math.random() * 12));

  // 룰렛 후보 - player1용 (player2로 선택된 플레이어 제외)
  const player1Candidates = useMemo(() => {
    return players.filter((p) => p.memberId !== selectedPlayer2Id);
  }, [players, selectedPlayer2Id]);

  // 룰렛 후보 - player2용 (player1로 선택된 플레이어 제외)
  const player2Candidates = useMemo(() => {
    return players.filter((p) => p.memberId !== selectedPlayer1Id);
  }, [players, selectedPlayer1Id]);

  // 룰렛 시작 시간 / 사이클
  const player1StartAt = swapData.player1StartAt || null;
  const player1CycleMs = swapData.player1CycleMs || 150;
  const player2StartAt = swapData.player2StartAt || null;
  const player2CycleMs = swapData.player2CycleMs || 150;
  const arrowStartAt = swapData.arrowStartAt || null;
  const arrowCycleMs = swapData.arrowCycleMs || 120;

  // 카테고리+방향 조합 목록
  const arrowOptions = useMemo(() => {
    const options = [];
    CATEGORIES.forEach((cat) => {
      DIRECTIONS.forEach((dir) => {
        options.push({ category: cat, direction: dir });
      });
    });
    return options;
  }, []);

  // 룰렛 활성화 여부 (박스가 활성가 되어야 하고, 선택된 값이 없어야만 룰렛 애니메이션 작동)
  const isPlayer1Roulette = activeBox === 'player1' && !selectedPlayer1Id;
  const isPlayer2Roulette = activeBox === 'player2' && !selectedPlayer2Id;
  const isArrowRoulette = activeBox === 'arrow' && (!selectedCategory || !selectedDirection);
  const isAnyRoulette = isPlayer1Roulette || isPlayer2Roulette || isArrowRoulette;

  // 룰렛 애니메이션
  useEffect(() => {
    if (!isAnyRoulette) return;

    const tick = () => {
      setNowMs(Date.now());
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isAnyRoulette]);

  // 현재 룰렛 인덱스들
  const player1Index = useMemo(() => {
    if (selectedPlayer1Id) {
      const idx = player1Candidates.findIndex((c) => c.memberId === selectedPlayer1Id);
      return idx >= 0 ? idx : 0;
    }
    if (!isPlayer1Roulette || player1Candidates.length === 0) {
      // SelectCategory에서는 랜덤값 사용
      return activeBox === null ? randomPlayer1Index % player1Candidates.length : 0;
    }
    return computeIndex(player1StartAt, nowMs, player1CycleMs, player1Candidates.length);
  }, [
    selectedPlayer1Id,
    isPlayer1Roulette,
    player1Candidates,
    player1StartAt,
    nowMs,
    player1CycleMs,
    activeBox,
    randomPlayer1Index,
  ]);

  const player2Index = useMemo(() => {
    if (selectedPlayer2Id) {
      const idx = player2Candidates.findIndex((c) => c.memberId === selectedPlayer2Id);
      return idx >= 0 ? idx : 0;
    }
    if (!isPlayer2Roulette || player2Candidates.length === 0) {
      // SelectCategory에서는 랜덤값 사용
      return activeBox === null ? randomPlayer2Index % player2Candidates.length : 0;
    }
    return computeIndex(player2StartAt, nowMs, player2CycleMs, player2Candidates.length);
  }, [
    selectedPlayer2Id,
    isPlayer2Roulette,
    player2Candidates,
    player2StartAt,
    nowMs,
    player2CycleMs,
    activeBox,
    randomPlayer2Index,
  ]);

  const arrowIndex = useMemo(() => {
    if (selectedCategory && selectedDirection) {
      const idx = arrowOptions.findIndex((o) => o.category === selectedCategory && o.direction === selectedDirection);
      return idx >= 0 ? idx : 0;
    }
    if (!isArrowRoulette) {
      // SelectCategory에서는 랜덤값 사용
      return activeBox === null ? randomArrowIndex % arrowOptions.length : 0;
    }
    return computeIndex(arrowStartAt, nowMs, arrowCycleMs, arrowOptions.length);
  }, [
    selectedCategory,
    selectedDirection,
    isArrowRoulette,
    arrowOptions,
    arrowStartAt,
    nowMs,
    arrowCycleMs,
    activeBox,
    randomArrowIndex,
  ]);

  // 현재 표시할 데이터
  const currentPlayer1 = player1Candidates[player1Index] || player1Candidates[0];
  const currentPlayer2 = player2Candidates[player2Index] || player2Candidates[0];
  const currentArrow = arrowOptions[arrowIndex] || arrowOptions[0];

  const char1 = CHARACTERS.find((c) => c.id === currentPlayer1?.characterId) || CHARACTERS[0];
  const char2 = CHARACTERS.find((c) => c.id === currentPlayer2?.characterId) || CHARACTERS[0];

  // 스페이스바로 확정 (내 턴에서만 작동)
  useSpaceKey(
    () => {
      if (isPlayer1Roulette && onConfirm && currentPlayer1) {
        onConfirm('player1', { player1Id: currentPlayer1.memberId });
      } else if (isPlayer2Roulette && onConfirm && currentPlayer2) {
        onConfirm('player2', { player2Id: currentPlayer2.memberId });
      } else if (isArrowRoulette && onConfirm) {
        onConfirm('arrow', { category: currentArrow.category, direction: currentArrow.direction });
      }
    },
    { enabled: isMyTurn && isAnyRoulette },
  );

  // 박스 클릭 가능 여부 (SelectCategory에서만)
  const canClickBox = activeBox === null && isMyTurn && typeof onBoxClick === 'function';

  return (
    <>
      {/* 왼쪽 - 플레이어1 */}
      {selectedPlayer1Id ? (
        <div className={'swap-selected-player1'}>
          <Shadow fill={true} opacity={0.4} blur={2}>
            <img src={char1.rightImage} alt={char1.name} />
          </Shadow>
        </div>
      ) : (
        <div
          className={`swap-box swap-box-left ${canClickBox ? 'clickable' : ''} ${isPlayer1Roulette ? 'active' : ''}`}
          onClick={() => canClickBox && onBoxClick('player1')}
        >
          <div className="swap-box-white-area">
            <div className="swap-box-icon-area">
              <img src={char1.roomListImage} alt={char1.name} className="swap-box-icon" />
            </div>
          </div>
          <img src="/images/swap/ui-swap-left.webp" alt="" className="swap-box-frame" />
        </div>
      )}

      {/* 가운데 - 재화/방향 */}
      {selectedCategory && selectedDirection ? (
        <div className="swap-selected-arrow">
          <img src={getCenterIcon(selectedCategory, selectedDirection)} alt="" />
        </div>
      ) : (
        <div
          className={`swap-box swap-box-center ${canClickBox ? 'clickable' : ''} ${isArrowRoulette ? 'active' : ''}`}
          onClick={() => canClickBox && onBoxClick('arrow')}
        >
          <div className="swap-box-white-area">
            <div className="swap-box-icon-area">
              <img
                src={getCenterIcon(currentArrow.category, currentArrow.direction)}
                alt=""
                className="swap-box-icon"
              />
            </div>
          </div>
          <img src="/images/swap/ui-swap-center.webp" alt="" className="swap-box-frame" />
        </div>
      )}

      {/* 오른쪽 - 플레이어2 */}
      {selectedPlayer2Id ? (
        <div className="swap-selected-player2">
          <Shadow fill={true} opacity={0.4} blur={2}>
            <img src={char2.leftImage} alt={char2.name} />
          </Shadow>
        </div>
      ) : (
        <div
          className={`swap-box swap-box-right ${canClickBox ? 'clickable' : ''} ${isPlayer2Roulette ? 'active' : ''}`}
          onClick={() => canClickBox && onBoxClick('player2')}
        >
          <div className="swap-box-white-area">
            <div className="swap-box-icon-area">
              <img src={char2.roomListImage} alt={char2.name} className="swap-box-icon" />
            </div>
          </div>
          <img src="/images/swap/ui-swap-right.webp" alt="" className="swap-box-frame" />
        </div>
      )}
    </>
  );
}
