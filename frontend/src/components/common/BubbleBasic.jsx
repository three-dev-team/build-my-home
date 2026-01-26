import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';

const BubbleBasic = ({
  children,
  onClick,
  showArrow = false,
  speaker = '', // 말하는 사람 이름 (비어있으면 표시 안 함)
  speakerColor, // 스피커 이름표 색상 (theme.pillColor보다 우선 적용)
  theme = {
    bubbleColor: '#FFF8EC',
    pillColor: '#D3A670', // 좀 더 부드러운 갈색 (동숲 스타일)
    circleColor: '#FFE5B2',
    textColor: '#594A3D', // 부드러운 고동색
  },
}) => {
  const [characterCount, setCharacterCount] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [fullText, setFullText] = useState('');

  const typingSpeed = 30; // ms per char

  // 텍스트 길이 계산 헬퍼 (재귀)
  const calculateTotalLength = useCallback((node) => {
    if (typeof node === 'string' || typeof node === 'number') {
      return String(node).length;
    }
    if (Array.isArray(node)) {
      return node.reduce((acc, child) => acc + calculateTotalLength(child), 0);
    }
    if (React.isValidElement(node)) {
      return calculateTotalLength(node.props.children);
    }
    return 0;
  }, []);

  // 리치 텍스트 렌더링 헬퍼 (재귀)
  const renderSliced = useCallback(
    (node, counterRef) => {
      if (typeof node === 'string' || typeof node === 'number') {
        const text = String(node);
        const len = text.length;
        const start = counterRef.current;
        const end = start + len;

        counterRef.current += len;

        if (characterCount >= end) return text;
        if (characterCount <= start) return '';
        return text.slice(0, characterCount - start);
      }

      if (Array.isArray(node)) {
        return node.map((child, i) => <React.Fragment key={i}>{renderSliced(child, counterRef)}</React.Fragment>);
      }

      if (React.isValidElement(node)) {
        const processedChildren = React.Children.map(node.props.children, (child) => renderSliced(child, counterRef));
        return React.cloneElement(node, { ...node.props }, processedChildren);
      }

      return null;
    },
    [characterCount],
  );

  // 텍스트 내용만 추출하는 헬퍼 (비교용)
  const extractTextContent = useCallback((node) => {
    if (typeof node === 'string' || typeof node === 'number') {
      return String(node);
    }
    if (Array.isArray(node)) {
      return node.map(extractTextContent).join('');
    }
    if (React.isValidElement(node)) {
      return extractTextContent(node.props.children);
    }
    return '';
  }, []);

  // 이전 텍스트 내용을 기억하기 위한 Ref
  const prevTextContentRef = useRef('');

  // 1. Children 변경 감지 -> fullText 업데이트 준비 (길이 계산으로 변경)
  useEffect(() => {
    // 텍스트 총 길이 계산
    const totalLen = calculateTotalLength(children);
    // 현재 텍스트 내용 추출 (비교용)
    const currentTextContent = extractTextContent(children);

    if (totalLen === 0) {
      setIsTyping(false);
      setFullText('');
      prevTextContentRef.current = '';
      return;
    }

    // ★ 핵심 수정: 단순히 children이 변했다고 리셋하지 않고, '실제 텍스트 내용'이 달라졌을 때만 리셋
    if (prevTextContentRef.current === currentTextContent) {
      return;
    }

    // 텍스트가 달라졌으므로 업데이트 및 타이핑 시작
    prevTextContentRef.current = currentTextContent;
    setFullText(String(totalLen)); // fullText를 '길이 문자열'로 활용하여 trigger
    setCharacterCount(0);
    setIsTyping(true);
  }, [children, calculateTotalLength, extractTextContent]);

  // 2. 타이핑 애니메이션 실행 (isTyping 변화에 반응)
  useEffect(() => {
    if (!isTyping || !fullText) return;

    const targetLength = parseInt(fullText, 10);

    const timer = setInterval(() => {
      setCharacterCount((prev) => {
        if (prev < targetLength) {
          return prev + 1;
        } else {
          setIsTyping(false);
          clearInterval(timer);
          return prev;
        }
      });
    }, typingSpeed);

    return () => clearInterval(timer);
  }, [isTyping, fullText]);

  // 상호작용 (클릭/키보드): 타이핑 중엔 완료, 완료됐으면 onClick(다음)
  const handleInteraction = useCallback(
    (e) => {
      e?.stopPropagation();

      if (isTyping) {
        // 타이핑 중이면 즉시 완성
        setCharacterCount(parseInt(fullText, 10));
        setIsTyping(false);
      } else {
        // 타이핑 끝났으면 부모 핸들러(다음 대화 등) 실행
        if (onClick) onClick();
      }
    },
    [isTyping, fullText, onClick],
  );

  // 키보드 이벤트 (Space, Enter)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        handleInteraction();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleInteraction]);

  // 표시할 최종 컨텐츠 계산
  const renderContent = () => {
    const targetLen = parseInt(fullText || '0', 10);

    // 타이핑이 끝났거나(typing false) 보여줄 글자수(characterCount)가 전체 길이(targetLen)에 도달했으면
    // 원본 그대로 렌더링 (이벤트 핸들러, 스타일 등 온전하게 보존)
    if (!isTyping && characterCount >= targetLen) {
      return children;
    }

    // 타이핑 중이면 슬라이스 렌더링
    const counterRef = { current: 0 };
    return renderSliced(children, counterRef);
  };

  // 최종 사용할 색상 결정
  const currentPillColor = speakerColor || theme.pillColor;

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="absolute bottom-12 left-0 right-0 px-4 flex justify-center cursor-pointer font-gaegu"
      style={{ zIndex: 2000 }} // z-index 대폭 상향
      onClick={handleInteraction}
    >
      <div className="relative w-full max-w-2xl">
        {/* 상단 왼쪽 장식 (말하는 사람 이름 / 짙은 알약) - speaker가 있을 때만 렌더링 */}
        {speaker && (
          <div
            className="absolute -top-4 left-10 h-9 px-6 flex items-center justify-center rounded-full z-20 shadow-sm"
            style={{ backgroundColor: currentPillColor }}
          >
            <span className="text-[#FFF8EC] font-bold text-xl tracking-wider pt-1">{speaker}</span>
          </div>
        )}

        {/* 메인 말풍선 */}
        <div
          className="relative rounded-[50px] p-8 pb-10 text-center w-full z-10 min-h-[140px] flex items-center justify-center"
          style={{
            backgroundColor: theme.bubbleColor,
            color: theme.textColor,
            boxShadow: '0 8px 0 rgba(0,0,0,0.05), 0 15px 20px rgba(0,0,0,0.1)',
          }}
        >
          <div className="relative z-10 text-3xl md:text-4xl font-bold leading-relaxed whitespace-pre-wrap word-break-keep-all pt-2">
            {renderContent()}
          </div>

          {/* 진행 화살표 (타이핑 다 끝나고, showArrow true일 때만) */}
          {showArrow && !isTyping && (
            <div className="absolute right-10 bottom-4 text-[#F3A530] animate-bounce text-2xl font-bold">▼</div>
          )}
        </div>

        {/* 꼬리 (SVG) */}
        <div
          className="absolute left-1/2 -bottom-4 transform -translate-x-1/2 z-20 drop-shadow-sm"
          style={{ color: theme.bubbleColor }}
        >
          <svg width="40" height="25" viewBox="0 0 40 25" fill="currentColor">
            <path d="M0 0 Q20 25 40 0 Z" />
          </svg>
        </div>
      </div>
    </motion.div>
  );
};

export default BubbleBasic;
