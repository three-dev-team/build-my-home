import { useState, useEffect } from 'react';
import Subtitle from '../../components/common/Subtitle.jsx';
import { COLORS } from '../../constants/colors.js';
import './css/GameIntro.css';

const GameIntro = ({ onSkip }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isTypingComplete, setIsTypingComplete] = useState(false);

  // 게임 설명 스크립트
  const scripts = [
    {
      nameText: '여울',
      nameColor: COLORS.characters.yeoul.nameBox,
      nameTextColor: COLORS.characters.yeoul.nameText,
      contentText: '안녕하세요! 전 여울이라고 합니다!\n지어봐요 마이홈에 오신 여러분 모두 환영해요!',
      highlights: [
        { text: '지어봐요 마이홈', color: COLORS.ac.grass },
        { text: '여울', color: COLORS.characters.yeoul.nameText },
      ],
    },
    {
      nameText: '여울',
      nameColor: COLORS.characters.yeoul.nameBox,
      nameTextColor: COLORS.characters.yeoul.nameText,
      contentText: '모든 칸에는 각각 다양한 이벤트가 발생한답니다!\n 주사위를 굴려 열심히 보드판을 돌아다녀보세요!',
      highlights: [
        { text: '이벤트', color: COLORS.ac.yellow },
      ],
    },
    {
      nameText: '여울',
      nameColor: COLORS.characters.yeoul.nameBox,
      nameTextColor: COLORS.characters.yeoul.nameText,
      contentText: '자원을 모아 집을 업그레이드할 수 있어요!\n업그레이드는 빠를수록 유리하답니다!',
    },
    {
      nameText: '여울',
      nameColor: COLORS.characters.yeoul.nameBox,
      nameTextColor: COLORS.characters.yeoul.nameText,
      contentText: '게임이 끝나기 전까지 가장 먼저 집을 완성한 사람이 승리합니다!\n그럼... 모두 준비되셨나요?',
      options: [
        { text: '시작할래!', onClick: () => handleStart() },
      ],
    },
  ];

  const currentScript = scripts[currentStep];

  // 자동 진행 타이머 (3초)
  useEffect(() => {
    // 마지막 스텝이면 자동 진행하지 않음
    if (currentStep >= scripts.length - 1) return;

    const timer = setTimeout(() => {
      setCurrentStep((prev) => prev + 1);
      setIsTypingComplete(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, [currentStep, scripts.length]);

  const handleTypingComplete = () => {
    setIsTypingComplete(true);
  };

  const handleStart = () => {
    onSkip();
  };

  const handleRestart = () => {
    setCurrentStep(0);
    setIsTypingComplete(false);
  };

  const handleSkipAll = () => {
    onSkip();
  };

  return (
      <div className="intro-container">
        {/* 배경 이미지 */}
        <div
          className="intro-background"
          style={{
            backgroundImage: 'url(/images/bg-intro.jpeg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            width: '100%',
            height: '100%',
            position: 'relative',
          }}
        >
          {/* Skip 버튼 (마지막 스텝이 아닐 때만) */}
          {currentStep < scripts.length - 1 && (
            <button className="skip-button" onClick={handleSkipAll}>
              Skip →
            </button>
          )}

          {/* 진행 인디케이터 */}
          <div className="intro-progress">
            {scripts.map((_, idx) => (
              <span
                key={idx}
                className={`progress-dot ${idx === currentStep ? 'active' : ''} ${idx < currentStep ? 'completed' : ''}`}
              />
            ))}
          </div>

          {/* Subtitle 컴포넌트 */}
          <Subtitle
            nameText={currentScript.nameText}
            nameColor={currentScript.nameColor}
            nameTextColor={currentScript.nameTextColor}
            contentText={currentScript.contentText}
            highlights={currentScript.highlights}
            options={currentScript.options}
            optionDisabled={!isTypingComplete}
            showTriangle={false} // 삼각형 비활성화
            typingSpeed={50}
            onTypingComplete={handleTypingComplete}
            className="intro-subtitle"
          />
        </div>
      </div>
  );
};

export default GameIntro;
