import React from 'react';
import InstructionText from '../../../components/common/InstructionText.jsx';

export default function RewardDiscoverScreen({ kind, isMyTurn, characterImage }) {
  const instruction =
    kind === 'fruit'
      ? '스페이스바를 눌러 과일 수집하기'
      : '스페이스바를 눌러 재화 수집하기';

  const text = isMyTurn ? instruction : '상대가 수집 중이야... 잠시만 기다려줘!';

  return (
    <>
      {/* Discover 캐릭터(발끝 bottom 기준) */}
      <div className="reward-character-wrap-bottom" aria-hidden="true">
        <div className="reward-character-box">
          {characterImage ? (
            <img className="reward-character-img" src={characterImage} alt="" draggable={false} />
          ) : null}
        </div>
      </div>

      <InstructionText>{text}</InstructionText>
    </>
  );
}
