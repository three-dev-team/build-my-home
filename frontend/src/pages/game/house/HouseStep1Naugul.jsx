// src/pages/game/house/HouseStep1Naugul.jsx
import React, { useMemo } from 'react';
import Subtitle from '../../../components/common/Subtitle.jsx';
import { COLORS } from '../../../constants/colors.js';

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
  const myName = useMemo(() => getPlayerDisplayName(player), [player]);

  return (
    <>
      {/* 캐릭터 박스(PSD 핑크 기준) w=280, h=480, left=668, bottom=300 */}
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

      {/* Subtitle 자체는 배치 기능이 없어서 wrapper(absolute 배치용)는 필요함 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: px(60),
          zIndex: 5,
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'auto',
        }}
      >
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
          showTriangle
          clickTriangle={() => {
            // 예시: 다음 단계로 넘기기
            onNext?.();
          }}
        />
      </div>
    </>
  );
}
