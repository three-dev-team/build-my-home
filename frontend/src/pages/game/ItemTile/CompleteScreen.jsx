import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import Subtitle from '../../../components/common/Subtitle.jsx';
import { COLORS } from '../../../constants/colors.js';
import { ITEM_INFO_BY_KEY } from '../../../constants/items.js';
import { CHARACTERS } from '../../../constants/characters.js';

const toBool = (v) => v === true || v === 'true';

const fallbackItem = (key) => ({
  key,
  name: '아이템',
  image: '/images/item/item-custom_dice.webp',
});

const getCharacterColor = (characterId) => {
  const id = Number(characterId);
  const c = CHARACTERS.find((x) => Number(x.id) === id);
  return c?.color || COLORS.ac.darkBrown;
};

const getCharacterHabit = (characterId) => {
  const id = Number(characterId);
  const c = CHARACTERS.find((x) => Number(x.id) === id);
  return String(c?.habit ?? '히히').trim() || '히히';
};

export default function CompleteScreen({
                                         playerName,
                                         newItemKey,
                                         characterImage,
                                         characterId,
                                         isMyTurn,
                                         handleExit,
                                       }) {
  const myTurn = toBool(isMyTurn);

  const hasItem = !!newItemKey;

  const item = useMemo(() => {
    if (!hasItem) return null;
    return ITEM_INFO_BY_KEY[newItemKey] || fallbackItem(newItemKey);
  }, [hasItem, newItemKey]);

  const itemName = String(item?.name ?? '아이템').trim();

  const habit = useMemo(() => getCharacterHabit(characterId), [characterId]);

  const contentText = `히히 ${itemName} 아이템을 획득했어!\n어떻게 써볼까? ${habit}~`;

  // 하이라이트: 아이템 이름만 nookCyan
  const highlights = useMemo(() => [{ text: itemName, color: COLORS.ac.nookCyan }], [itemName]);

  // 이름 박스 배경색: 캐릭터 색 사용
  const nameBoxColor = useMemo(() => getCharacterColor(characterId), [characterId]);

  return (
    <motion.div
      className="itemtile-layer"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        if (myTurn) handleExit?.();
      }}
      style={{ cursor: myTurn ? 'pointer' : 'default' }}
    >
      <div className="itemtile-top-pill">잠시후 자동으로 이동합니다...</div>

      {/* 캐릭터 박스: 360x660 / 상단 정렬 */}
      <div className="itemtile-character-box itemtile-char-complete" aria-hidden>
        <div className="itemtile-character-inner">
          {characterImage ? <img src={characterImage} alt="" draggable={false} /> : null}
        </div>

        {/* 결과 아이템: 160x160 / top=116 / right=-44 */}
        {hasItem && item ? (
          <div className="itemtile-complete-item" aria-hidden>
            <img src={item.image} alt="" draggable={false} />
          </div>
        ) : null}
      </div>

      <div className="itemtile-subtitle-scope">
        <Subtitle
          nameText={playerName}
          nameColor={nameBoxColor}
          nameTextColor={COLORS.ac.creamWhite}
          contentText={contentText}
          contentColor={COLORS.subtitle.contentBox}
          contentTextColor={COLORS.subtitle.contentText}
          highlights={highlights}
          options={[]}
          showTriangle={false}
          typingSpeed={30}
        />
      </div>
    </motion.div>
  );
}
