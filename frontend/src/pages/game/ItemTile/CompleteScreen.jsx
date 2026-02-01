import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import Subtitle from '../../../components/common/Subtitle.jsx';
import { COLORS } from '../../../constants/colors.js';

const toBool = (v) => v === true || v === 'true';

const CompleteScreen = ({ playerName, characterImage, isMyTurn, handleExit, nameBoxColor }) => {
  const myTurn = toBool(isMyTurn);

  const cursor = useMemo(() => (myTurn ? 'pointer' : 'default'), [myTurn]);

  return (
    <motion.div
      className="itemtile-layer"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        if (myTurn) handleExit();
      }}
      style={{ cursor }}
    >
      <div className="itemtile-top-pill">잠시후 자동으로 이동합니다...</div>

      <div className="itemtile-character-box" aria-hidden style={{ '--charScale': 1.28 }}>
        {characterImage ? <img src={characterImage} alt="" draggable={false} /> : null}
      </div>

      <div className="itemtile-subtitle-scope">
        <Subtitle
          nameText={playerName}
          nameColor={nameBoxColor}
          nameTextColor={COLORS.ac.creamWhite}
          contentText={'좋아! 아이템 정리가 끝났어!\n이제 다시 진행하자!'}
          contentColor={COLORS.subtitle.contentBox}
          contentTextColor={COLORS.subtitle.contentText}
          options={[]}
          showTriangle={false}
          typingSpeed={30}
        />
      </div>
    </motion.div>
  );
};

export default CompleteScreen;
