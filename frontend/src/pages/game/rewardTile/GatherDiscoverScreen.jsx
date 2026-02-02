import React from 'react';
import InstructionText from '../../../components/common/InstructionText.jsx';

export default function GatherDiscoverScreen({ kind, isMyTurn, characterImage }) {
  // 종류에 따라 안내 문구 결정
  const instruction =
    kind === 'fruit'
      ? '스페이스바를 눌러 과일 수집하기'
      : '스페이스바를 눌러 재화 수집하기';

  // 내 턴이면 조작 안내, 아니면 관전 안내
  const text = isMyTurn ? instruction : '상대가 수집 중이야... 잠시만 기다려줘!';

  return (
    <>
      // 캐릭터 영역(다른 단계와 동일한 wrapper/클래스를 사용)
      <div className="gather-character-wrap" aria-hidden="true">
        <div className="gather-character-box">
          {characterImage ? (
            <img
              className="gather-character-img"
              src={characterImage}
              alt=""
              draggable={false}
            />
          ) : null}
        </div>
      </div>

      // 하단 안내 텍스트(InstructionText가 위치/스타일 담당)
      <InstructionText>{text}</InstructionText>
    </>
  );
}
