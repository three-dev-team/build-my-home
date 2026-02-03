import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import './Subtitle.css';
import { COLORS as _COLORS } from '../../constants/colors.js';

/**
 * Subtitle
 *
 * - 기본 색상은 무조건 colors.js의 COLORS.subtitle.* 사용(= default 유지)
 * - props로 색을 넘기면 해당 색으로 덮어쓸 수 있음(= 색만 바꾸기/내용만 바꾸기)
 * - showTriangle=true면 PSD 버튼 영역(52x32) + ui-bubble-arrow.svg 마스크로 표시
 */
function Subtitle({
                    // 이름 박스
                    nameText,
                    nameColor,
                    nameTextColor,

                    // 메인 박스
                    contentText,
                    contentColor,
                    contentTextColor,
                    highlights = [],

                    // 옵션 박스
                    options,
                    optionColor,
                    optionTextColor,
                    optionDisabled = false,

                    // 삼각형
                    showTriangle = false,
                    clickTriangle,

                    // 타이핑
                    typingSpeed = 30,
                    onTypingComplete,
                  }) {
  // ✅ colors.js 기반 default 색 (import 실패해도 런타임에서 안 죽게 fallback)
  const COLORS = _COLORS ?? {
    subtitle: {
      contentBox: '#fffae4',
      contentText: '#5b4d33',
      arrow: '#ffb700',
      optionBox: '#fcec9e',
      optionText: '#5b4d33',
    },
    characters: {
      default: { nameBox: '#9B59B6', nameText: '#FFFFFF' },
    },
  };

  // ✅ “default 색은 유지” = props가 없으면 COLORS.subtitle.* 그대로
  const resolvedNameColor = nameColor ?? COLORS.characters?.default?.nameBox ?? '#9B59B6';
  const resolvedNameTextColor = nameTextColor ?? COLORS.characters?.default?.nameText ?? '#FFFFFF';

  const resolvedContentColor = contentColor ?? COLORS.subtitle?.contentBox ?? '#fffae4';
  const resolvedContentTextColor = contentTextColor ?? COLORS.subtitle?.contentText ?? '#5b4d33';

  const resolvedOptionColor = optionColor ?? COLORS.subtitle?.optionBox ?? '#fcec9e';
  const resolvedOptionTextColor = optionTextColor ?? COLORS.subtitle?.optionText ?? '#5b4d33';

  const resolvedArrowColor = COLORS.subtitle?.arrow ?? '#ffb700';

  const [characterCount, setCharacterCount] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const prevTextRef = useRef('');

  // contentText 변경 감지 → 타이핑 시작
  useEffect(() => {
    if (!contentText) {
      setIsTyping(false);
      setCharacterCount(0);
      prevTextRef.current = '';
      return;
    }
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
        if (prev < targetLength) return prev + 1;
        setIsTyping(false);
        clearInterval(timer);
        onTypingComplete?.();
        return prev;
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

  // displayText에서 highlights 단어만 색칠
  const highlightedNodes = useMemo(() => {
    if (!displayText) return null;

    const rules = Array.isArray(highlights)
      ? highlights
        .filter((h) => h && typeof h.text === 'string' && h.text.trim())
        .sort((a, b) => b.text.length - a.text.length)
      : [];

    if (!rules.length) return displayText;

    const ranges = [];
    for (const rule of rules) {
      const needle = rule.text;
      let startIndex = 0;
      while (startIndex < displayText.length) {
        const idx = displayText.indexOf(needle, startIndex);
        if (idx === -1) break;
        ranges.push({
          start: idx,
          end: idx + needle.length,
          color: rule.color || resolvedContentTextColor,
        });
        startIndex = idx + needle.length;
      }
    }

    if (!ranges.length) return displayText;

    ranges.sort((a, b) => a.start - b.start);

    // 겹침 방지(앞에서부터 하나씩만)
    const merged = [];
    let lastEnd = 0;
    for (const r of ranges) {
      if (r.start < lastEnd) continue;
      merged.push(r);
      lastEnd = r.end;
    }

    const nodes = [];
    let cursor = 0;

    merged.forEach((r, i) => {
      if (cursor < r.start) nodes.push(<span key={`t-${i}-pre`}>{displayText.slice(cursor, r.start)}</span>);
      nodes.push(
        <span key={`t-${i}-hi`} style={{ color: r.color }}>
          {displayText.slice(r.start, r.end)}
        </span>,
      );
      cursor = r.end;
    });

    if (cursor < displayText.length) nodes.push(<span key="t-last">{displayText.slice(cursor)}</span>);
    return nodes;
  }, [displayText, highlights, resolvedContentTextColor]);

  const optionBoxClass = options?.length >= 3 ? 'option-box-large' : 'option-box-small';

  return (
    <div className="subtitle-root">
      {/* 이름 박스 */}
      {nameText && (
        <div className="name-box" style={{ backgroundColor: resolvedNameColor }}>
          <div className="name-text" style={{ color: resolvedNameTextColor }}>
            {nameText}
          </div>
        </div>
      )}

      {/* 메인 박스 */}
      <div
        className="content-box"
        style={{ backgroundColor: resolvedContentColor, cursor: isTyping ? 'pointer' : 'default' }}
        onClick={handleClick}
      >
        <div className="content-text" style={{ color: resolvedContentTextColor, whiteSpace: 'pre-wrap' }}>
          {highlightedNodes}
          {isTyping && <span className="typing-cursor">|</span>}
        </div>
      </div>

      {/* 옵션 박스 */}
      {options && options.length > 0 && !isTyping && (
        <div className={`option-box ${optionBoxClass}`} style={{ backgroundColor: resolvedOptionColor }}>
          <div className="option-text" style={{ color: resolvedOptionTextColor }}>
            {options.map((option, idx) => (
              <span
                key={idx}
                className="option-row"
                style={{
                  cursor: option.onClick && !optionDisabled ? 'pointer' : 'default',
                }}
                onClick={() => {
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

      {/* ✅ PSD 버튼 영역: w52 h32 / 메인박스 bottom(80) + 16 */}
      {showTriangle && !isTyping && (
        <button
          type="button"
          className="triangle-btn"
          onClick={() => clickTriangle?.()}
          disabled={!clickTriangle}
          aria-label="다음"
          style={{
            backgroundColor: resolvedArrowColor, // ✅ colors.js의 COLORS.subtitle.arrow
            cursor: clickTriangle ? 'pointer' : 'default',
          }}
        />
      )}
    </div>
  );
}

export default Subtitle;
