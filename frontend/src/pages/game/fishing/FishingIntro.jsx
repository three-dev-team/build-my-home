// fishing/FishingIntro.jsx
import { useEffect, useMemo } from 'react';

import Subtitle from '../../../components/common/Subtitle.jsx';
import InstructionText from '../../../components/common/InstructionText.jsx';

import { COLORS } from '../../../constants/colors.js';

import './Fishing.css';

export default function FishingIntro({
                                       step,
                                       isMyTurn,
                                       speakerName,
                                       speakerCharacter,
                                       baitAvailable,
                                       onDecideBait,
                                       onAutoNext,
                                     }) {
  useEffect(() => {
    if (step !== 'INTRO_CAPTION') return;
    const t = setTimeout(() => onAutoNext?.(), 2000);
    return () => clearTimeout(t);
  }, [step, onAutoNext]);

  const captionText = useMemo(() => {
    return '낚시터가 좋아보이네...\n생선을 잡아보자!';
  }, []);

  const baitText = useMemo(() => {
    return '내가 전에 낚시떡밥을 사놓은게 있었지?\n한 번 사용해 볼까?\n상어를 잡을 수 있을지도 몰라!';
  }, []);

  const nameHighlight = useMemo(() => {
    const c = String(speakerCharacter?.color ?? '').trim();
    return c || COLORS.ac.nookCyan;
  }, [speakerCharacter]);

  return (
    <>
      {step === 'INTRO_CAPTION' && (
        <Subtitle
          nameText={speakerName}
          nameColor={COLORS.characters.default.nameBox}
          nameTextColor={COLORS.characters.default.nameText}
          contentText={captionText}
          options={[]}
          optionDisabled
          showTriangle={false}
          typingSpeed={30}
          highlights={[{ text: String(speakerName), color: nameHighlight }]}
        />
      )}

      {step === 'INTRO_BAIT' && (
        <Subtitle
          nameText={speakerName}
          nameColor={COLORS.characters.default.nameBox}
          nameTextColor={COLORS.characters.default.nameText}
          contentText={baitText}
          options={
            baitAvailable
              ? [
                { text: '사용해보자!', onClick: () => isMyTurn && onDecideBait?.(true) },
                { text: '다음에 쓸래!', onClick: () => isMyTurn && onDecideBait?.(false) },
              ]
              : [{ text: '확인', onClick: () => isMyTurn && onDecideBait?.(false) }]
          }
          optionDisabled={!isMyTurn}
          showTriangle={false}
          typingSpeed={30}
          highlights={[{ text: String(speakerName), color: nameHighlight }]}
        />
      )}

      {(step === 'INTRO_GUIDE' || step === 'INTRO_READY') && (
        <InstructionText text={step === 'INTRO_GUIDE' ? '스페이스바를 눌러 물고기 잡기' : '스페이스바를 눌러 시작하기'} />
      )}
    </>
  );
}
