import React, { useState } from 'react';
import Subtitle from '../../../components/common/Subtitle.jsx';
import { COLORS, withAlpha } from '../../../constants/colors.js';
import { CHARACTERS } from '../../../constants/characters.js';
import './Machurilla.css';

const IntroScreen = ({ step, setStep, onSelect, isMyTurn, currentPlayerName, characterId }) => {
  const [typingDone, setTypingDone] = useState(false);
  const characterColor = CHARACTERS.find((c) => c.id === characterId)?.color || '#FFFFFF';

  const getContentText = () => {
    if (step === 0) return '라리추마 라리추마…\n라리추마 시드반…';
    if (step === 1) return `호오, ${currentPlayerName}…\n보입니다… 보이는군요…`;
    return '이 마추릴라에게만 보이는\n당신의 기운…\n카드를 뽑아보시겠습니까…';
  };

  const handleTriangleClick = () => {
    if (!isMyTurn || !typingDone) return;
    setTypingDone(false);
    setStep(step + 1);
  };

  const highlights = step >= 1 ? [{ text: currentPlayerName, color: characterColor }] : [];

  const options =
    step === 2
      ? [
          { text: '잘 부탁합니다!', onClick: () => isMyTurn && onSelect() },
          { text: '무서운데…', onClick: () => isMyTurn && onSelect() },
        ]
      : [];

  return (
    <div className="machurilla-bg machurilla-bg-idle">
      <Subtitle
        nameText="마추릴라"
        nameColor={COLORS.characters.machurilla.nameBox}
        nameTextColor={COLORS.characters.machurilla.nameText}
        contentBoxColor={withAlpha(COLORS.characters.machurilla.contentBox, 0.9)}
        contentTextColor={COLORS.characters.machurilla.contentText}
        contentText={getContentText()}
        highlights={highlights}
        showTriangle={step < 2 && typingDone}
        clickTriangle={handleTriangleClick}
        onTypingComplete={() => setTypingDone(true)}
        options={options}
        optionDisabled={!isMyTurn}
      />
    </div>
  );
};

export default IntroScreen;
