// SelectCategory.jsx
import { useMemo } from 'react';
import InstructionText from '../../../components/common/InstructionText.jsx';
import SwapBoxes from './SwapBoxes.jsx';
import './Swap.css';

const IMG = {
  clickSvg: '/images/board/icon-click.svg',
  clickWebp: '/images/board/icon-click.webp',
};

export default function SelectCategory({ isMyTurn, player, players, onAction }) {
  // swapData 파싱
  //{
  //   "player1Id": 123,
  //   "player2Id": 456,
  //   "category": "BELL",
  //   "direction": "TO_RIGHT",
  //   "player1StartAt": 1700000000000,
  //   "player1CycleMs": 150
  // }
  const swapData = useMemo(() => {
    try {
      return JSON.parse(player?.actionDataStr || '{}');
    } catch {
      return {};
    }
  }, [player?.actionDataStr]);

  // 박스 클릭 → 해당 stage로 이동
  const handleBoxClick = (boxType) => {
    if (!isMyTurn) return;
    if (boxType === 'player1') {
      onAction('SWAP_START_PLAYER1_ROULETTE', {});
    } else if (boxType === 'player2') {
      onAction('SWAP_START_PLAYER2_ROULETTE', {});
    } else if (boxType === 'arrow') {
      onAction('SWAP_START_ARROW_ROULETTE', {});
    }
  };

  return (
    <div className="swap-container swap-main">
      <SwapBoxes
        activeBox={null}
        isMyTurn={isMyTurn}
        player={player}
        players={players}
        swapData={swapData}
        onBoxClick={handleBoxClick}
      />

      <InstructionText>
        {isMyTurn ? (
          <span className="instruction-inline">
            원하는 옵션을 클릭하세요
            <img
              src={IMG.clickSvg}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = IMG.clickWebp;
              }}
              alt="click"
              draggable={false}
              className="instruction-click-icon"
            />
          </span>
        ) : (
          `${player?.nickname || '플레이어'}의 차례입니다`
        )}
      </InstructionText>
    </div>
  );
}
