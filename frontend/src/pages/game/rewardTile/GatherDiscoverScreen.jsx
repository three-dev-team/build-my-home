import React from 'react';
import InstructionText from '../../../components/common/InstructionText.jsx';

export default function GatherDiscoverScreen({ kind, isMyTurn, characterImage }) {
  const instruction =
    kind === 'fruit'
      ? '스페이스바를 눌러 과일 수집하기'
      : '스페이스바를 눌러 재화 수집하기';

  const text = isMyTurn ? instruction : '상대가 수집 중이야... 잠시만 기다려줘!';

  return (
    <>
      {/* ✅ 1단계도 wrapper 구조로 통일 (2단계와 위치 100% 동일해짐) */}
      <div className="gather-character-wrap" aria-hidden="true">
        <div className="gather-character-box">
          {characterImage ? (
            <img className="gather-character-img" src={characterImage} alt="" draggable={false} />
          ) : null}
        </div>
      </div>

      <InstructionText>{text}</InstructionText>
    </>
  );
}
