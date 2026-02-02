import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { useGameTimer } from '../../hooks/useGameTimer.js';
import Subtitle from '../../components/common/Subtitle.jsx';
import { COLORS } from '../../constants/colors.js';

// TODO: GameConstants.java와 일치해야 함
const STAMP_REWARDS = [0, 50, 200, 1000];

const Start = ({ isMyTurn = false, player, currentPlayerName = '익명의 주민', onAction, onExit }) => {
  const step = player?.uiStep || 0;
  const collectedStamps = player?.collectedStamps || [];
  const stampCount = collectedStamps.length;
  // uiStep 0: 프론트에서 미리보기 계산
  // uiStep 1: 서버에서 받은 실제 값
  const reward = step === 0 ? STAMP_REWARDS[Math.min(stampCount, 3)] : player?.actionData || 0;

  // 캐릭터 색상
  const yeoul = COLORS.characters.yeoul;

  // 자동 나가기 처리 (중복 방지)
  const hasExited = useRef(false);

  const handleExit = () => {
    if (hasExited.current) return;
    hasExited.current = true;
    if (!isMyTurn) return;
    onExit();
  };

  // TODO: 프론트 타이머 대신 서버 타임아웃 방식으로 변경 필요
  useGameTimer(step === 1 || step === 2 ? 3 : 0, handleExit);

  const handleExchange = () => {
    if (!isMyTurn) return;
    onAction('START_STAMP_EXCHANGE', {});
  };

  const handleSkip = () => {
    if (!isMyTurn) return;
    onAction('START_STAMP_SKIP', {});
  };

  // 컨텐츠 텍스트 생성
  const getContentText = () => {
    if (stampCount === 3) {
      return `${currentPlayerName}!\n스탬프를 다 모았구나 대단해!\n스탬프를 다 모았으니 무려 ${reward}벨을 받을 수 있다고!\n정산할래?`;
    } else if (stampCount > 0) {
      return `${currentPlayerName}!\n스탬프 ${stampCount}개 모았네.\n정산하면 ${reward}벨 받아!\n정산할래?`;
    } else {
      return `${currentPlayerName}!\n아직 스탬프가 없네...\n다음에 또 오렴!`;
    }
  };

  // 옵션 생성
  const getOptions = () => {
    if (stampCount > 0) {
      return [
        { text: '응! 지금 할게', onClick: handleExchange },
        { text: '다음에 할게', onClick: handleSkip },
      ];
    } else {
      return [{ text: '다음에 보자', onClick: handleSkip }];
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 w-screen h-screen flex flex-col items-center justify-center z-[100] overflow-hidden bg-blue-200"
    >
      {/* uiStep 0: 정산 여부 질문 */}
      {step === 0 && (
        <Subtitle
          nameText="여울"
          nameColor={yeoul.nameBox}
          nameTextColor={yeoul.nameText}
          contentText={getContentText()}
          options={getOptions()}
          optionDisabled={!isMyTurn}
          showTriangle
        />
      )}

      {/* uiStep 1: 정산 완료 */}
      {step === 1 && (
        <Subtitle
          nameText="여울"
          nameColor={yeoul.nameBox}
          nameTextColor={yeoul.nameText}
          contentText={`${reward}벨을 송금했어!\n여기 새로운 카드를 줄게.\n또 모으면 좋은 일이 생길거야!\n다음에 또 보자!`}
        />
      )}

      {/* uiStep 2: 스킵 */}
      {step === 2 && (
        <Subtitle
          nameText="여울"
          nameColor={yeoul.nameBox}
          nameTextColor={yeoul.nameText}
          contentText="알겠어!\n스탬프 더 모아서 와!"
        />
      )}
    </motion.div>
  );
};

export default Start;
