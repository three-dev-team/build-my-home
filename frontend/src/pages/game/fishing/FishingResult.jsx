// fishing/FishingResult.jsx
import { useMemo } from 'react';

import Subtitle from '../../../components/common/Subtitle.jsx';
import { COLORS } from '../../../constants/colors.js';

import './Fishing.css';

export default function FishingResult({ isMyTurn, speakerName, resultMessage, raw }) {
  const text = useMemo(() => {
    if (resultMessage) return resultMessage;
    const harvestType = String(raw?.harvestType || '').trim();
    if (harvestType) return `${harvestType} 획득!`;
    return '결과를 확인했어!';
  }, [resultMessage, raw]);

  return (
    <Subtitle
      nameText={speakerName}
      nameColor={COLORS.characters.default.nameBox}
      nameTextColor={COLORS.characters.default.nameText}
      contentText={text}
      options={[]}
      optionDisabled
      showTriangle={false}
      typingSpeed={30}
    />
  );
}
