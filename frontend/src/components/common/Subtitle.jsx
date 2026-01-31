import React, { useState, useEffect, useCallback, useRef } from 'react';
import './Subtitle.css';
import { COLORS } from '../../constants/colors.js';

/**
 * @param {string} nameText - 이름 박스 텍스트
 * @param {string} nameColor - 이름 박스 색상
 * @param {string} nameTextColor - 이름 텍스트 색상
 *
 * @param {string} contentText - 메인 박스 텍스트
 * @param {string} contentColor - 메인 박스 색상
 * @param {string} contentTextColor - 메인 텍스트 색상
 *
 * @param {array} options - 옵션 배열 [{ text: '텍스트', onClick: 핸들러 }, ...]
 * @param {string} optionColor - 옵션 박스 색상
 * @param {string} optionTextColor - 옵션 텍스트 색상
 * @param {boolean} optionDisabled - 옵션 클릭 비활성화
 *
 * @param {boolean} showTriangle - 삼각형 표시 여부 (true: 표시, false: 숨김)
 *
 * @param {number} typingSpeed - 타이핑 애니메이션 속도 (ms per char)
 * @param {function} onTypingComplete - 타이핑 애니메이션 완료 시 호출되는 콜백 함수
 *
 * 사용 예시 (2개 옵션 - option-box-small):
 * <Subtitle
 *   nameText="여울"
 *   contentText="정산할래?"
 *   options={[
 *     { text: '응! 지금 할게', onClick: handleExchange },
 *     { text: '다음에 할게', onClick: handleSkip },
 *   ]}
 *   optionDisabled={!isMyTurn}
 * />
 *
 * 사용 예시 (3개 옵션 - option-box-large):
 * <Subtitle
 *   nameText="너굴"
 *   contentText="뭘 도와줄까?"
 *   options={[
 *     { text: '대출받기', onClick: handleBorrow },
 *     { text: '대출갚기', onClick: handleRepay },
 *     { text: '나가기', onClick: handleExit },
 *   ]}
 * />
 *
 * 사용 예시 (클릭 없는 단일 텍스트):
 * <Subtitle
 *   nameText="여울"
 *   contentText="알겠어!"
 *   options={[{ text: '잠시 후 자동으로 닫힙니다...' }]}
 * />
 */
const Subtitle = ({
  // 이름 박스
  nameText,
  nameColor = '#9B59B6',
  nameTextColor = '#FFFFFF',

  // 메인 박스
  contentText,
  contentColor = COLORS.subtitle.contentBox,
  contentTextColor = COLORS.subtitle.contentText,

  // 옵션 박스
  options, // [{ text, onClick }, ...]
  optionColor = COLORS.subtitle.optionBox,
  optionTextColor = COLORS.subtitle.optionText,
  optionDisabled = false,

  // 삼각형
  showTriangle = false,

  // 텍스트 애니메이션
  typingSpeed = 30,
  onTypingComplete,
}) => {
  const [characterCount, setCharacterCount] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const prevTextRef = useRef('');

  // contentText 변경 감지 → 타이핑 시작
  useEffect(() => {
    if (!contentText) {
      setIsTyping(false);
      return;
    }

    // 텍스트가 달라졌을 때만 리셋
    if (prevTextRef.current === contentText) return;

    prevTextRef.current = contentText;
    setCharacterCount(0);
    setIsTyping(true);
  }, [contentText]);

  // 타이핑 애니메이션
  useEffect(() => {
    if (!isTyping || !contentText) return;

    const targetLength = contentText.length;

    const timer = setInterval(() => {
      setCharacterCount((prev) => {
        if (prev < targetLength) {
          return prev + 1;
        } else {
          setIsTyping(false);
          clearInterval(timer);
          onTypingComplete?.();
          return prev;
        }
      });
    }, typingSpeed);

    return () => clearInterval(timer);
  }, [isTyping, contentText, typingSpeed, onTypingComplete]);

  // 클릭하면 즉시 완성
  const handleClick = useCallback(() => {
    if (isTyping && contentText) {
      setCharacterCount(contentText.length);
      setIsTyping(false);
      onTypingComplete?.();
    }
  }, [isTyping, contentText, onTypingComplete]);

  // 표시할 텍스트
  const displayText = contentText ? contentText.slice(0, characterCount) : '';

  // 옵션 개수에 따라 클래스 결정 (2개 이하: small, 3개 이상: large)
  const optionBoxClass = options?.length >= 3 ? 'option-box-large' : 'option-box-small';

  return (
    <>
      {/* 이름 박스 */}
      {nameText && (
        <div className="name-box" style={{ backgroundColor: nameColor }}>
          <div className="name-text" style={{ color: nameTextColor }}>
            {nameText}
          </div>
        </div>
      )}

      {/* 메인 박스 (클릭하면 타이핑 스킵) */}
      <div
        className="content-box"
        style={{ backgroundColor: contentColor, cursor: isTyping ? 'pointer' : 'default' }}
        onClick={handleClick}
      >
        <div className="content-text" style={{ color: contentTextColor, whiteSpace: 'pre-line' }}>
          {displayText}
          {isTyping && <span className="typing-cursor">|</span>}
        </div>
      </div>

      {/* 옵션 박스 (타이핑 끝나면 표시) */}
      {options && options.length > 0 && !isTyping && (
        <div className={`option-box ${optionBoxClass}`} style={{ backgroundColor: optionColor }}>
          <div className="option-text" style={{ color: optionTextColor }}>
            {options.map((option, idx) => (
              <span
                key={idx}
                style={{
                  display: 'block',
                  cursor: option.onClick && !optionDisabled ? 'pointer' : 'default',
                }}
                onClick={() => {
                  console.log('클릭됨:', option.text, 'disabled:', optionDisabled);
                  if (optionDisabled) return;
                  option.onClick?.();
                }}
              >
                {option.text}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 삼각형 (타이핑 끝나면 표시) */}
      {showTriangle && !isTyping && <div className="triangle" style={{ backgroundColor: COLORS.subtitle.arrow }}></div>}
    </>
  );
};

export default Subtitle;
