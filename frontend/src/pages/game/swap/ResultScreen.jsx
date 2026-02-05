// ResultScreen.jsx
import { useMemo } from 'react';
import Subtitle from '../../../components/common/Subtitle.jsx';
import { COLORS } from '../../../constants/colors.js';
import './Swap.css';
import SwapBoxes from './SwapBoxes.jsx';

export default function ResultScreen({ isMyTurn, player, players, onExit }) {
  // swapData 파싱
  const swapData = useMemo(() => {
    try {
      return JSON.parse(player?.actionDataStr || '{}');
    } catch {
      return {};
    }
  }, [player?.actionDataStr]);

  // 플레이어 정보
  const player1 = players.find((p) => p.memberId === swapData.player1Id);
  const player2 = players.find((p) => p.memberId === swapData.player2Id);
  const p1Name = player1?.nickname || '플레이어1';
  const p2Name = player2?.nickname || '플레이어2';

  const { category, direction, resultAmount, resultCount, resultLoanAdded } = swapData;

  // 결과 문장 조립
  const buildResultText = () => {
    const postFix = '\n꿈속에서는 그 무엇도 불가능하지 않답니다... 후훗.';

    if (category === 'HOUSE') {
      return `${p1Name} 님과 ${p2Name} 님의\n안식처가 서로 뒤바뀌었군요...${postFix}`;
    }

    if (category === 'BELL') {
      if (direction === 'EXCHANGE') {
        return `${p1Name} 님과 ${p2Name} 님의\n모든 벨이 서로의 운명을 찾아갔네요.${postFix}`;
      }
      const from = direction === 'TO_RIGHT' ? p1Name : p2Name;
      const to = direction === 'TO_RIGHT' ? p2Name : p1Name;
      let text = `꿈의 파동이 ${from}님에게서 ${to}님에게로 흘러\n${resultAmount || 0}벨이 전달되었습니다.`;
      if (resultLoanAdded && resultLoanAdded > 0) {
        text += `\n"부족한 벨은 미래의 꿈으로 채웠답니다.."\n(${from}님에게 ${resultLoanAdded}벨의 채무가 생겼습니다)`;
      }
      return text;
    }

    if (category === 'RESOURCE') {
      if (direction === 'EXCHANGE') {
        return `${p1Name} 님과 ${p2Name} 님의\n소중한 재화들이 서로 자리를 바꿨군요.${postFix}`;
      }
      const from = direction === 'TO_RIGHT' ? p1Name : p2Name;
      const to = direction === 'TO_RIGHT' ? p2Name : p1Name;
      return `${from} 님이 모은 재화 ${resultCount || 0}개가\n${to} 님의 꿈속으로 흘러 들어갔네요.${postFix}`;
    }

    if (category === 'LOAN') {
      if (direction === 'EXCHANGE') {
        return `${p1Name} 님과 ${p2Name} 님의\n부채마저 꿈처럼 서로 뒤섞여버렸군요.${postFix}`;
      }
      const from = direction === 'TO_RIGHT' ? p1Name : p2Name;
      const to = direction === 'TO_RIGHT' ? p2Name : p1Name;
      return `${from} 님의 ${resultAmount || 0}벨 대출이라는 짐이\n${to} 님에게 옮겨가고 말았네요...${postFix}`;
    }

    return `꿈의 파동이 잦아들며\n모든 것이 새롭게 바뀌었습니다.${postFix}`;
  };

  // 클릭 시 이벤트 종료
  const handleClick = () => {
    if (!isMyTurn) return;
    onExit?.();
  };

  return (
    <div className="swap-container swap-main">
      {/* 선택된 캐릭터/방향카테고리 표시 */}
      <SwapBoxes activeBox={null} isMyTurn={isMyTurn} players={players} swapData={swapData} />

      {/* 결과 자막 */}
      <Subtitle
        nameText="몽셰르"
        nameColor={COLORS.characters.mongsher.nameBox}
        nameTextColor={COLORS.characters.mongsher.nameText}
        contentText={buildResultText()}
        showTriangle={isMyTurn}
        clickTriangle={handleClick}
      />
    </div>
  );
}
