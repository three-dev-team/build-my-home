import { useEffect } from 'react';

import Subtitle from '../../../components/common/Subtitle.jsx';
import InstructionText from '../../../components/common/InstructionText.jsx';

import './Fishing.css';

const CAPTION_TEXT = '낚시터가 좋아보이네...\n물고기를 잡아보자!';
const BAIT_TEXT =
  '전에 사둔 낚시떡밥이 있어!\n이번에 사용할까?\n(희귀 물고기를 잡을 확률이 올라가!)';

export default function FishingIntro({
                                       step,
                                       isMyTurn,

                                       nameText,
                                       baitAvailable,

                                       onDecideBait,
                                       onNextFromCaption,
                                       onProceedFromReady,
                                     }) {
  useEffect(() => {
    // READY: Space/Enter로 진행(start 요청)
    if (step !== 'INTRO_READY') return;
    if (!isMyTurn) return;

    const onKeyDown = (e) => {
      if (e.repeat) return;
      if (e.key === ' ' || e.key === 'Spacebar' || e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        onProceedFromReady?.();
      }
    };

    window.addEventListener('keydown', onKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [step, isMyTurn, onProceedFromReady]);

  if (step === 'INTRO_BAIT' && !baitAvailable) {
    // BAIT인데 떡밥이 없으면 READY 화면으로 대체
    return (
      <div className="bmhFishing-introStage">
        <InstructionText>스페이스바를 눌러 물고기 잡기</InstructionText>
      </div>
    );
  }

  const subtitleColors = {
    // Subtitle 색상은 루트에서 주입된 CSS 변수 사용
    nameColor: 'var(--bmhFishing-subtitleNameBox)',
    nameTextColor: 'var(--bmhFishing-subtitleNameText)',
  };

  if (step === 'INTRO_CAPTION') {
    // 1) INTRO_CAPTION
    return (
      <div className="bmhFishing-introStage">
        <div className="bmhFishing-introSubtitle">
          <Subtitle
            nameText={nameText}
            nameColor={subtitleColors.nameColor}
            nameTextColor={subtitleColors.nameTextColor}
            contentText={CAPTION_TEXT}
            options={[]}
            optionDisabled
            showTriangle
            clickTriangle={() => isMyTurn && onNextFromCaption?.()}
            typingSpeed={30}
          />
        </div>

        <div
          className="bmhFishing-fullClick"
          role="button"
          tabIndex={0}
          onClick={() => isMyTurn && onNextFromCaption?.()}
          onKeyDown={(e) => {
            if (!isMyTurn) return;
            if (e.key === 'Enter' || e.key === ' ') onNextFromCaption?.();
          }}
          aria-label="낚시 인트로 다음"
        />
      </div>
    );
  }

  if (step === 'INTRO_BAIT') {
    // 2) INTRO_BAIT
    return (
      <div className="bmhFishing-introStage">
        <div className="bmhFishing-introSubtitle">
          <Subtitle
            nameText={nameText}
            nameColor={subtitleColors.nameColor}
            nameTextColor={subtitleColors.nameTextColor}
            contentText={BAIT_TEXT}
            options={[
              { text: '사용해보자!', onClick: () => isMyTurn && onDecideBait?.(true) },
              { text: '다음에 쓸래!', onClick: () => isMyTurn && onDecideBait?.(false) },
            ]}
            optionDisabled={!isMyTurn}
            showTriangle={false}
            typingSpeed={30}
          />
        </div>
      </div>
    );
  }

  if (step === 'INTRO_READY') {
    // 3) INTRO_READY
    return (
      <div className="bmhFishing-introStage">
        <InstructionText>스페이스바를 눌러 물고기 잡기</InstructionText>
      </div>
    );
  }

  return null;
}
