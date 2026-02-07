import React, { useMemo } from 'react';
import InstructionText from '../../../components/common/InstructionText.jsx';
import Shadow from '../../../components/common/Shadow.jsx';

// 보상 발견(Discover) 단계 화면
export default function RewardDiscoverScreen({ kind, isMyTurn, characterImage }) {
  // 보상 종류에 따른 안내 문구
  const instruction = useMemo(() => {
    if (kind === 'fruit') return '스페이스바를 눌러 과일 수집하기';
    return '스페이스바를 눌러 재화 수집하기';
  }, [kind]);

  // 내 턴이면 안내, 아니면 관전 대기 문구
  const text = isMyTurn ? instruction : '상대가 수집 중이야... 잠시만 기다려줘!';

  return (
    <>
      {/* 캐릭터 하단 고정(발 기준) */}
      <div className="reward-character-wrap-bottom" aria-hidden="true">
        <div className="reward-character-box">
          {characterImage ? (
            <Shadow fill={true} offsetY={-1.3} scale={1.5} opacity={1}>
              <img className="reward-character-img" src={characterImage} alt="" draggable={false} />
            </Shadow>
          ) : null}
        </div>
      </div>

      {/* 하단 안내 텍스트 */}
      <InstructionText>{text}</InstructionText>
    </>
  );
}
