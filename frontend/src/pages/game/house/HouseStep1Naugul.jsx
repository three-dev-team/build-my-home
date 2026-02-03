import React, { useMemo } from 'react';
import Subtitle from '../../../components/common/Subtitle.jsx';
import { COLORS } from '../../../constants/colors.js';

// player 객체에서 표시 이름을 최대한 안전하게 뽑기(없으면 기본값)
const getPlayerDisplayName = (player) =>
  player?.nickname || player?.playerName || player?.memberName || player?.name || '플레이어';

export default function HouseStep1Naugul({
                                           player,
                                           isMyTurn,
                                           character,
                                           px,
                                           onSelectUpgrade,
                                           onSelectMaterials,
                                         }) {
  // 말풍선에 넣을 내 이름(플레이어 표시명)
  const myName = useMemo(() => getPlayerDisplayName(player), [player]);

  return (
    <>
      {/* 캐릭터(좌석+등) 이미지 표시 영역: PSD 기준 위치/크기 고정 */}
      <div
        style={{
          position: 'absolute',
          left: px(668),
          bottom: px(300),
          width: px(280),
          height: px(480),
          pointerEvents: 'none',
          zIndex: 2,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {character?.seatbackImage ? (
          <img
            src={character.seatbackImage}
            alt="seatback-character"
            draggable={false}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              objectPosition: 'center bottom',
              display: 'block',
            }}
          />
        ) : null}
      </div>

      {/* 너굴 말풍선(옵션 2개) */}
      <Subtitle
        nameText="너굴" // 이름 박스 텍스트
        nameColor={COLORS.characters.naugul.nameBox} // 이름 박스 배경색
        nameTextColor={COLORS.characters.naugul.nameText} // 이름 글자색
        contentText={`${myName}...\n무슨 업무를 보러왔나구리?`} // 본문(줄바꿈 포함)
        highlights={[{ text: myName, color: character?.color || COLORS.ac.darkBrown }]} // 내 이름만 강조
        options={[
          { text: '업그레이드 할래', onClick: () => isMyTurn && onSelectUpgrade?.() }, // 업그레이드 페이지로
          { text: '집 재료 알려줘', onClick: () => isMyTurn && onSelectMaterials?.() }, // 재료 안내 페이지로
        ]}
        optionDisabled={!isMyTurn} // 내 턴 아니면 옵션 비활성
      />
    </>
  );
}
