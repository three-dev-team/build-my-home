import React, { useState } from 'react';
import { COLORS, withAlpha } from '../../../constants/colors.js';
import './Machurilla.css';
import Subtitle from '../../../components/common/Subtitle.jsx';
import AutoMove from '../../../components/common/AutoMove.jsx';

const RESULT_MESSAGES = {
  MONEY: {
    UP: '오오...!\n황금빛 기운이 당신의 주머니로 쏟아지고 있어요!\n벨이 두 배로 불어나는 기적이 일어났습니다!',
    DOWN: '이럴 수가...\n당신의 주머니가 텅 비어버리는 불길한 예감이...\n아쉽지만 모든 벨이 연기처럼 사라졌습니다.',
  },
  PROPERTY: {
    UP: '당신의 보금자리에 새로운 기운이 깃듭니다!\n뚝딱뚝딱...\n집이 한 단계 더 멋지게 변했군요!',
    DOWN: '세상에... 집터의 기운이 흔들리고 있어요.\n아쉽게도 집이 한 단계 작아지는\n시련을 겪게 되겠군요.',
  },
  HEALTH: {
    UP: '당신에게서 넘치는 활력이 느껴집니다!\n그 에너지를 모아 주사위를 한 번 더 던져보세요!',
    DOWN: '이런... 몸이 천근만근 무거워 보여요.\n잠시 쉬어가는 지혜가 필요할 때입니다.\n다음 차례는 꿈나라에서 보내시길...',
  },
  FRIENDSHIP: {
    UP: '진정한 우정은 나눔에서 시작되는 법...\n당신의 선의가 다른 이들을 행복하게 할 것입니다.',
    DOWN: '타인의 기운을 강제로 뺏는 것은\n운명의 흐름을 거스르는 일...\n주머니는 채웠으나 주변은 차가워집니다.',
  },
};

const ResultScreen = ({ step, setStep, result, isMyTurn }) => {
  const [typingDone, setTypingDone] = useState(false);

  const [cardType, direction] = result?.split('_') || ['MONEY', 'UP'];
  const cardImageSrc = `/images/machurilla/card-machurilla-${cardType.toLowerCase()}-${direction.toLowerCase()}.webp`;
  const localStep = step - 4; // 0, 1, 2

  const handleTriangleClick = () => {
    if (!isMyTurn || !typingDone) return;
    setTypingDone(false);
    setStep(step + 1);
  };

  const getBgClass = () => {
    if (localStep === 1) return 'machurilla-bg-result';
    if (localStep === 2) return 'machurilla-bg-card';
    return 'machurilla-bg-idle';
  };

  if (localStep === 2) {
    const message = RESULT_MESSAGES[cardType]?.[direction] || RESULT_MESSAGES.MONEY.UP;

    return (
      <div className={`machurilla-bg ${getBgClass()}`}>
        <div className="machurilla-result-card-area">
          <img
            src={cardImageSrc}
            alt="결과 카드"
            className="machurilla-result-card-img"
            style={{
              filter: `drop-shadow(0 0 30px ${direction === 'UP' ? '#FFD700' : '#BF00FF'})`,
              // 운세가 좋으면(UP) 금색, 나쁘면(DOWN) 보라색 테두리 광채 추가
            }}
          />
        </div>
        <AutoMove open text="잠시후 자동으로 이동합니다..." />
        <Subtitle
          nameText="마추릴라"
          nameColor={COLORS.characters.machurilla.nameBox}
          nameTextColor={COLORS.characters.machurilla.nameText}
          contentBoxColor={withAlpha(COLORS.characters.machurilla.contentBox, 0.9)}
          contentTextColor={COLORS.characters.machurilla.contentText}
          contentText={message}
        />
      </div>
    );
  }

  // result-1
  if (localStep === 0) {
    return (
      <div className={`machurilla-bg ${getBgClass()}`}>
        <Subtitle
          nameText="마추릴라"
          nameColor={COLORS.characters.machurilla.nameBox}
          nameTextColor={COLORS.characters.machurilla.nameText}
          contentBoxColor={withAlpha(COLORS.characters.machurilla.contentBox, 0.9)}
          contentTextColor={COLORS.characters.machurilla.contentText}
          contentText={'…엄머나…\n보이기 시작합니다…'}
          showTriangle={typingDone}
          clickTriangle={handleTriangleClick}
          onTypingComplete={() => setTypingDone(true)}
        />
      </div>
    );
  }

  // result-2
  return (
    <div className={`machurilla-bg ${getBgClass()}`}>
      <Subtitle
        nameText="마추릴라"
        nameColor={COLORS.characters.machurilla.nameBox}
        nameTextColor={COLORS.characters.machurilla.nameText}
        contentText="이야아아 - - - 압!"
        contentBoxColor={withAlpha(COLORS.characters.machurilla.boomBox, 0.9)}
        contentTextColor={withAlpha(COLORS.characters.machurilla.boomText)}
        contentMaskImage="/images/common/ui-bubble-content-boom.svg"
        contentFontSize="calc(100 * var(--u))"
        showTriangle={typingDone}
        clickTriangle={handleTriangleClick}
        onTypingComplete={() => setTypingDone(true)}
      />
    </div>
  );
};

export default ResultScreen;
