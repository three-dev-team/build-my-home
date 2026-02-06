// SelectSecondPlayer.jsx
import { useMemo } from 'react';
import InstructionText from '../../../components/common/InstructionText.jsx';
import SwapBoxes from './SwapBoxes.jsx';
import './Swap.css';

export default function SelectSecondPlayer({ isMyTurn, player, players, onAction }) {
  // swapData 파싱
  const swapData = useMemo(() => {
    try {
      return JSON.parse(player?.actionDataStr || '{}');
    } catch {
      return {};
    }
  }, [player?.actionDataStr]);

  // 룰렛 확정 → 서버에 전송 후 SelectCategory로 복귀
  const handleConfirm = (boxType, data) => {
    if (!isMyTurn) return;
    onAction('SWAP_PLAYER2_CONFIRM', data);
  };

  return (
    <div className="swap-container swap-main">
      <SwapBoxes
        activeBox="player2"
        isMyTurn={isMyTurn}
        player={player}
        players={players}
        swapData={swapData}
        onConfirm={handleConfirm}
      />

      <InstructionText>
        {isMyTurn ? '스페이스바를 눌러 멈추기' : `${player?.nickname || '플레이어'}의 차례입니다`}
      </InstructionText>
    </div>
  );
}
