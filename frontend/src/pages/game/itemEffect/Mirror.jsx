import React from 'react';
import BubbleBasic from '../../../components/common/BubbleBasic.jsx';
import { useGameTimer } from '../../../hooks/useGameTimer.js';

const MirrorPage = ({ isMyTurn, actionDataStr, players, onAction }) => {
  // actionDataStr 파싱: "MIRROR:상대ID:내원위치:상대원위치"
  const [_, targetId] = actionDataStr ? actionDataStr.split(':') : [null, null];

  // 상대방 닉네임 추출
  const otherPlayer = players.find((p) => String(p.memberId) === targetId);
  const otherPlayerName = otherPlayer?.nickname || '랜덤플레이어';

  // 모든 연출 종료 후
  const handleComplete = () => {
    if (!isMyTurn) return;
    onAction('MIRROR_COMPLETE', {});
  };

  useGameTimer(isMyTurn ? 5 : null, handleComplete);

  return (
    <div className="fixed inset-0 w-screen h-screen z-[100] flex flex-col items-center justify-center overflow-hidden">
      {/* 배경 이미지 */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: 'url(/images/item/mirror_bg.jpeg)',
          filter: 'brightness(0.9)',
        }}
      />

      {/* 중앙 캐릭터: 도루묵씨 정지 이미지 */}
      <div className="relative z-10 flex flex-col items-center">
        <img src="#" alt="도루묵씨" className="w-64 h-auto drop-shadow-2xl" />
      </div>

      {/* 도루묵씨 대사 말풍선 */}
      <BubbleBasic>
        {`${otherPlayerName}씨 자리로 단번에 갈 수 있는\n땅굴을 만들어주겠다무룩!\n\n
        ${otherPlayerName}씨는 안타깝지만 자리를 바꿔줘야겠어무룩!`}
      </BubbleBasic>
    </div>
  );
};

export default MirrorPage;
