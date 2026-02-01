import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';

import Subtitle from '../../../components/common/Subtitle.jsx';
import { COLORS } from '../../../constants/colors.js';
import { ITEM_INFO_BY_KEY } from '../../../constants/items.js';

const fallbackItem = (key) => ({
  key,
  name: '아이템',
  image: '/images/item/item-custom_dice.webp',
});

const CHAR_BOTTOM = 190;

// ✅ “캐릭터(360) vs 아이템(160) overlap 116px”
const OVERLAP_X = 180;

// ✅ 더 올림: 값 ↓ = 위로 올라감
const HAND_TOP = '10%';

export default function GetScreen({ playerName, newItemKey, characterImage, nameBoxColor }) {
  const item = useMemo(() => ITEM_INFO_BY_KEY[newItemKey] || fallbackItem(newItemKey), [newItemKey]);

  const [line1Done, setLine1Done] = useState(false);
  useEffect(() => setLine1Done(false), [newItemKey]);

  const baseText = COLORS.subtitle.contentText;

  return (
    <motion.div
      className="itemtile-layer"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      style={{
        '--charBottom': CHAR_BOTTOM,
        '--charScale': 1.0,
        '--overlapX': OVERLAP_X,
        '--handTop': HAND_TOP,
      }}
    >
      <div className="itemtile-top-pill">잠시후 자동으로 이동합니다...</div>

      <div className="itemtile-character-box" aria-hidden>
        <div className="itemtile-character-inner">
          {characterImage ? <img src={characterImage} alt="" draggable={false} /> : null}

          <motion.div
            className="itemtile-held-item"
            aria-hidden
            initial={{ scale: 0.6, opacity: 0, y: `calc(16 * var(--v))` }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <img src={item.image} alt="" draggable={false} />
          </motion.div>
        </div>
      </div>

      <Subtitle
        nameText={playerName}
        nameColor={nameBoxColor}
        nameTextColor={COLORS.ac.creamWhite}
        contentText={`큐룽큐룽!!!!!!!!!!!!!!!\n${item.name}을 획득했다큐룽!!!`}
        contentColor={COLORS.subtitle.contentBox}
        contentTextColor={baseText}
        options={[]}
        showTriangle={false}
        typingSpeed={30}
        onTypingComplete={() => setLine1Done(true)}
      />
    </motion.div>
  );
}
