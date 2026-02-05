import React, { useMemo, useState, useEffect, useRef } from 'react';
import './Subtitle.css';
import { COLORS } from '../../constants/colors.js';

/**
 * @param {string} nameText - 이름 박스 텍스트
 * @param {string} nameColor - 이름 박스 배경색
 * @param {string} nameTextColor - 이름 텍스트 색상
 *
 * @param {string} contentText - 메인 박스 텍스트
 * @param {string} contentTextColor - 메인 텍스트 색상
 * @param {array} highlights - 하이라이트 배열 [{ text: '텍스트', color: '#색상' }, ...]
 *
 * @param {array} options - 옵션 배열 [{ text: '텍스트', onClick: 핸들러 }, ...]
 * @param {boolean} optionDisabled - 옵션 클릭 비활성화
 *
 * @param {boolean} showTriangle - 삼각형 표시 여부
 * @param {function} clickTriangle - 삼각형 클릭 핸들러
 *
 * @param {number} typingSpeed - 타이핑 애니메이션 속도 (ms per char)
 * @param {function} onTypingComplete - 타이핑 애니메이션 완료 시 호출되는 콜백 함수
 *
 * @param {string} className - 추가 클래스
 *
 * [사용 방법 예시]
 *       <Subtitle
 *         nameText="너굴"
 *         nameColor={COLORS.characters.naugul.nameBox}
 *         nameTextColor={COLORS.characters.naugul.nameText}
 *         contentText={`${myName}...\n무슨 업무를 보러왔나구리?`}
 *         highlights={[{ text: myName, color: character?.color || COLORS.ac.darkBrown }]}
 *         options={[
 *           { text: '업그레이드 할래', onClick: () => isMyTurn && onSelectUpgrade?.() },
 *           { text: '집 재료 알려줘', onClick: () => isMyTurn && onSelectMaterials?.() },
 *         ]}
 *         optionDisabled={!isMyTurn}
 *       />
 */
// 본문 텍스트를 \n 기준으로 라인 배열로 분리
const splitLines = (text) => {
  if (text == null) return [];
  return String(text).split('\n');
};

// 한 줄에서 highlights.text를 찾아 지정 색으로 감싸 렌더링(긴 텍스트 우선 처리)
const applyHighlightsToLine = (line, highlights = []) => {
  if (!highlights?.length) return line;

  const sorted = [...highlights].sort((a, b) => (b.text?.length || 0) - (a.text?.length || 0));
  let parts = [line];

  sorted.forEach((h, idx) => {
    const t = h?.text;
    if (!t) return;

    const nextParts = [];
    parts.forEach((p) => {
      if (typeof p !== 'string') {
        nextParts.push(p);
        return;
      }
      const chunks = p.split(t);
      if (chunks.length === 1) {
        nextParts.push(p);
        return;
      }
      chunks.forEach((c, i) => {
        if (c) nextParts.push(c);
        if (i < chunks.length - 1) {
          nextParts.push(
            <span key={`${idx}-${i}-${t}`} style={{ color: h.color }}>
              {t}
            </span>,
          );
        }
      });
    });

    parts = nextParts;
  });

  return parts;
};

export default function Subtitle({
  nameText = '',
  nameColor = COLORS.characters.default.nameBox,
  nameTextColor = COLORS.characters.default.nameText,

  contentText = '',
  contentFontSize = null,
  contentTextColor = COLORS.subtitle.contentText,
  contentBoxColor = null,
  contentMaskImage = null,
  highlights = [],

  options = [],
  optionDisabled = false,

  showTriangle = false,
  clickTriangle = null,

  typingSpeed = 50,
  onTypingComplete = null,

  className = '',
}) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const timerRef = useRef(null);

  // 타이핑 애니메이션
  useEffect(() => {
    if (!contentText) {
      setDisplayedText('');
      setIsTyping(false);
      return;
    }

    setDisplayedText('');
    setIsTyping(true);

    let index = 0;
    timerRef.current = setInterval(() => {
      if (index < contentText.length) {
        setDisplayedText(contentText.slice(0, index + 1));
        index++;
      } else {
        clearInterval(timerRef.current);
        setIsTyping(false);
        onTypingComplete?.();
      }
    }, typingSpeed);

    return () => clearInterval(timerRef.current);
  }, [contentText, typingSpeed]);

  // 클릭 시 즉시 전체 텍스트 표시
  const handleSkipTyping = () => {
    if (isTyping) {
      clearInterval(timerRef.current);
      setDisplayedText(contentText);
      setIsTyping(false);
      onTypingComplete?.();
    } else {
      if (typeof clickTriangle === 'function') clickTriangle();
    }
  };

  // options가 실제로 존재하는지 여부(렌더링/클래스 분기 기준)
  const hasOptions = Array.isArray(options) && options.length > 0;

  // 옵션 개수에 따라 말풍선(2개/3개) 마스크 클래스 결정
  const optionBoxClass = useMemo(() => {
    if (!hasOptions) return '';
    return options.length >= 3 ? 'option-box-large' : 'option-box-small';
  }, [hasOptions, options.length]);

  // 본문 텍스트를 라인 단위로 메모이즈(개행 유지)
  const lines = useMemo(() => splitLines(displayedText), [displayedText]);

  return (
    // subtitle-root는 전체 오버레이(포인터 기본 none)이며 className으로 추가 스타일 확장
    <div className={`subtitle-root ${className}`}>
      <div className="content-wrap">
        {/* 이름 영역 */}
        {!!nameText && (
          <div className="name-box" style={{ backgroundColor: nameColor }}>
            <div className="name-text" style={{ color: nameTextColor }}>
              {nameText}
            </div>
          </div>
        )}

        {/* 본문 영역 */}
        <div
          className="content-box"
          style={{
            backgroundColor: contentBoxColor || COLORS.subtitle.contentBox,
            ...(contentMaskImage && {
              WebkitMaskImage: `url('${contentMaskImage}')`,
              maskImage: `url('${contentMaskImage}')`,
            }),
          }}
          onClick={handleSkipTyping}
        >
          <div
            className="content-text"
            style={{
              color: contentTextColor,
              ...(contentFontSize && { fontSize: contentFontSize }),
            }}
          >
            {/* 라인 단위 렌더링 + 하이라이트 적용 */}
            {lines.map((ln, i) => (
              <div key={i} style={{ display: 'block' }}>
                {applyHighlightsToLine(ln, highlights)}
              </div>
            ))}
          </div>
        </div>

        {/* 삼각형 버튼 - 항상 표시, 클릭 시 스킵 또는 다음 */}
        {showTriangle && (
          <button
            type="button"
            className="triangle-btn"
            aria-label="다음"
            style={{
              backgroundColor: COLORS.subtitle.arrow,
              cursor: 'pointer',
            }}
            onClick={handleSkipTyping}
          />
        )}
      </div>

      {/* options가 있으면 옵션 말풍선 렌더링(비활성 시 pointerEvents 차단) */}
      {hasOptions && (
        <div
          className={`option-box ${optionBoxClass}`}
          style={{
            backgroundColor: COLORS.subtitle.optionBox,
            '--highlight-color': COLORS.ac.yellow,
          }}
        >
          <div className="option-text" style={{ color: COLORS.subtitle.optionText }}>
            {options.map((opt, idx) => (
              <span
                key={idx}
                className="option-row"
                style={{
                  cursor: optionDisabled ? 'default' : 'pointer',
                  opacity: optionDisabled ? 0.55 : 1,
                  pointerEvents: optionDisabled ? 'none' : 'auto',
                }}
                onClick={() => {
                  // optionDisabled면 클릭 무시
                  if (optionDisabled) return;
                  opt?.onClick?.();
                }}
              >
                {opt?.text ?? ''}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
