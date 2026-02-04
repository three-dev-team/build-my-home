import React, { useMemo } from 'react';
import Subtitle from '../../../components/common/Subtitle.jsx';
import { COLORS } from '../../../constants/colors.js';

export default function HouseStep1Naugul({
                                           player,
                                           isMyTurn,
                                           character,
                                           px,
                                           onSelectUpgrade,
                                           onSelectMaterials,
                                         }) {
  const myName = useMemo(() => {
    const v = player?.nickname || player?.playerName || player?.memberName || player?.name || '플레이어';
    const s = String(v ?? '').trim();
    return s || '플레이어';
  }, [player]);

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
        nameText="너굴"
        nameColor={COLORS.characters.naugul.nameBox}
        nameTextColor={COLORS.characters.naugul.nameText}
        contentText={`${myName}...\n무슨 업무를 보러왔나구리?`}
        highlights={[{ text: myName, color: character?.color || COLORS.ac.darkBrown }]}
        options={[
          { text: '업그레이드 할래', onClick: () => isMyTurn && onSelectUpgrade?.() },
          { text: '집 재료 알려줘', onClick: () => isMyTurn && onSelectMaterials?.() },
        ]}
        optionDisabled={!isMyTurn}
      />
    </>
  );
}
