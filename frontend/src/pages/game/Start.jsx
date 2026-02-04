import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useGameTimer } from '../../hooks/useGameTimer.js';
import Subtitle from '../../components/common/Subtitle.jsx';
import { COLORS } from '../../constants/colors.js';
import { CHARACTERS } from '../../constants/characters.js';
import './css/Start.css';
import AspectLayout from '../../components/layout/AspectLayout';

// TODO: GameConstants.java와 일치해야 함
const STAMP_REWARDS = [0, 50, 200, 1000];

const Start = ({ isMyTurn = false, player, currentPlayerName = '익명의 주민', onAction, onExit }) => {
  const step = player?.uiStep || 0;
  const collectedStamps = player?.collectedStamps || [];
  const stampCount = collectedStamps.length;

  // 내부 대화 단계 관리 (0: 스탬프 개수 안내, 1: 정산 여부 질문)
  const [dialogStep, setDialogStep] = useState(0);

  // uiStep 0: 프론트에서 미리보기 계산
  // uiStep 1: 서버에서 받은 실제 값
  const reward = step === 0 ? STAMP_REWARDS[Math.min(stampCount, 3)] : player?.actionData || 0;

  // 캐릭터 색상
  const yeoul = COLORS.characters.yeoul;

  // 현재 플레이어의 캐릭터 정보 가져오기
  const character = CHARACTERS.find((c) => Number(c.id) === Number(player?.characterId));
  const charImg = character?.seatImage ?? null;

  // 자동 나가기 처리 (중복 방지)
  const hasExited = useRef(false);

  const handleExit = () => {
    if (hasExited.current) return;
    hasExited.current = true;
    if (!isMyTurn) return;
    onExit();
  };

  // 삼각형 클릭 핸들러
  const handleTriangleClick = () => {
    if (!isMyTurn) return;
    if (dialogStep === 0) {
      setDialogStep(1); // 다음 대화로 진행
    }
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

  // 컨텐츠 텍스트 생성 - 첫번째 대화
  const getFirstDialogText = () => {
    if (stampCount === 3) {
      return `와아아~! 대단해요 ${currentPlayerName} 님!\n세상에, 스탬프 카드를 빈틈없이 전부 채워오셨군요! 정말 축하드려요!`;
    } else if (stampCount > 0) {
      return `와아~! ${currentPlayerName} 님!\n그동안 스탬프를 무려 ${stampCount}개 모아오셨네요!`;
    } else {
      return `어머나, ${currentPlayerName} 님!\n아직 모아오신 스탬프가 하나도 없으시네요...\n아쉽지만 벨로 정산해드리기가 어렵답니다.`;
    }
  };

  // 두 번째 컨텐츠 텍스트 - 정산 여부 질문
  const getSecondDialogText = () => {
    if (stampCount > 0) {
      return `지금 정산하시면 ${reward}벨을 받으실 수 있는데...\n지금 정산해 드릴까요?`;
    }
    else {
      return `천천히 여행하시면서 도장들을 모아와 주세요!\n${currentPlayerName} 님이 첫 스탬프를 찍어오실 때까지\n저 여울이가 여기서 기다리고 있을게요!`;
    }
  };

  // 옵션 생성
  const getOptions = () => {
    if (stampCount > 0) {
      return [
        { text: '응 지금 할게', onClick: handleExchange },
        { text: '다음에 할게', onClick: handleSkip },
      ];
    } else {
      return [{ text: '다음에 보자', onClick: handleExit }];
    }
  };

  const nameHighlights = () => {
    return [{ text: currentPlayerName, color: COLORS.ac.ocean }];
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="start-container">
      {/* 플레이어 캐릭터 추가 */}
      {charImg && (
        <div className="start-player-character">
          {charImg && <img src={charImg} alt={currentPlayerName} className="start-character-img" draggable="false" />}
        </div>
      )}

      {/* uiStep 0: 정산 여부 질문 */}
      {step === 0 && (
        <>
          {/* 첫 번째 대화: 스탬프 개수 안내 */}
          {dialogStep === 0 && (
            <Subtitle
              nameText="여울"
              nameColor={yeoul.nameBox}
              nameTextColor={yeoul.nameText}
              contentText={getFirstDialogText()}
              highlights={nameHighlights()}
              showTriangle
              clickTriangle={handleTriangleClick} // 삼각형 클릭 핸들러
            />
          )}

          {/* 두 번째 대화: 정산 여부 질문 */}
          {dialogStep === 1 && (
            <Subtitle
              nameText="여울"
              nameColor={yeoul.nameBox}
              nameTextColor={yeoul.nameText}
              contentText={getSecondDialogText()}
              highlights={nameHighlights()}
              options={getOptions()}
              optionDisabled={!isMyTurn}
            />
          )}
        </>
      )}

      {/* uiStep 1: 정산 완료 */}
      {step === 1 && (
        <Subtitle
          nameText="여울"
          nameColor={yeoul.nameBox}
          nameTextColor={yeoul.nameText}
          contentText={`축하드립니다! 여기 정산하신 ${reward}벨이에요!\n아! 그리고 여기 새로운 방문카드도 준비했답니다!\n자, 그럼 다시 한번 즐거운 여행을 떠나볼까요?`}
        />
      )}

      {/* uiStep 2: 스킵 */}
      {step === 2 && (
        <Subtitle
          nameText="여울"
          nameColor={yeoul.nameBox}
          nameTextColor={yeoul.nameText}
          contentText={
            '아, 지금은 그냥 간직하고 싶으신 거군요?\n정산하고 싶어지면 언제든 저에게 말씀해 주세요.\n남은 시간도 즐겁게 보내시길 바랄게요!'
          }
        />
      )}
    </motion.div>
  );
};

export default Start;
