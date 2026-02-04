import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import Subtitle from '../../../components/common/Subtitle.jsx';
import AutoMove from '../../../components/common/AutoMove.jsx';
import { COLORS } from '../../../constants/colors.js';
import { CHARACTERS } from '../../../constants/characters.js';
import { normalizeItemKey, resolveItemKey } from '../../../constants/items.js';

const toBool = (v) => v === true || v === 'true';

// characterId로 캐릭터 메타 조회
const getCharacter = (characterId) => {
  const id = Number(characterId);
  return CHARACTERS.find((x) => Number(x.id) === id) || null;
};

// ItemTile Complete 단계(획득 결과/대사)
export default function CompleteScreen({
                                         playerName,
                                         newItemKey,
                                         characterImage,
                                         characterId,
                                         isMyTurn,
                                         handleExit,
                                       }) {
  const myTurn = toBool(isMyTurn);

  // 캐릭터 메타(이름색/습관)
  const character = useMemo(() => getCharacter(characterId), [characterId]);

  const nameBoxColor = useMemo(() => character?.color, [character]);

  const habit = useMemo(() => {
    const h = character?.habit;
    return typeof h === 'string' ? h.trim() : '';
  }, [character]);

  // 표시용 플레이어 이름 정리
  const nameText = useMemo(() => (typeof playerName === 'string' ? playerName.trim() : ''), [playerName]);

  // newItemKey -> 아이템 메타 정규화(resolveItemKey 기준)
  const item = useMemo(() => {
    const key = normalizeItemKey(newItemKey);
    if (!key) return null;
    const info = resolveItemKey(key);
    return info && typeof info === 'object' ? info : null;
  }, [newItemKey]);

  const itemName = useMemo(() => {
    const n = item?.name;
    return typeof n === 'string' ? n.trim() : '';
  }, [item]);

  const itemImage = useMemo(() => {
    const img = item?.image;
    return typeof img === 'string' ? img : '';
  }, [item]);

  // 대사 텍스트(아이템명/습관 여부만 분기)
  const contentText = useMemo(() => {
    const line1 = itemName ? `히히 ${itemName} 아이템을 획득했어!` : '히히 아이템을 획득했어!';
    const line2 = habit ? `어떻게 써볼까? ${habit}~` : '어떻게 써볼까?';
    return `${line1}\n${line2}`;
  }, [itemName, habit]);

  // 하이라이트(아이템명만)
  const highlights = useMemo(() => {
    if (!itemName) return [];
    return [{ text: itemName, color: COLORS.ac.nookCyan }];
  }, [itemName]);

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
      {/* 자동 이동 안내(내부 기본 문구 사용) */}
      <AutoMove />

      {/* 캐릭터 + 결과 아이템 */}
      <div className="itemtile-character-box itemtile-char-complete" aria-hidden>
        <div className="itemtile-character-inner">
          {characterImage ? <img src={characterImage} alt="" draggable={false} /> : null}
        </div>

        {itemImage ? (
          <div className="itemtile-complete-item" aria-hidden>
            <img src={itemImage} alt="" draggable={false} />
          </div>
        ) : null}
      </div>

      {/* 대사(Subtitle) */}
      <div className="itemtile-subtitle-scope">
        <Subtitle
          nameText={nameText}
          nameColor={nameBoxColor}
          nameTextColor={COLORS.ac.creamWhite}
          contentText={contentText}
          contentColor={COLORS.subtitle.contentBox}
          contentTextColor={COLORS.subtitle.contentText}
          highlights={highlights}
          options={[]}
          showTriangle={false}
        />
      </div>
    </motion.div>
  );
}
