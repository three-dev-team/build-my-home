import React, { useMemo } from 'react';
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
            </span>
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
                                   contentTextColor = COLORS.subtitle.contentText,
                                   highlights = [],

                                   options = [],
                                   optionDisabled = false,

                                   showTriangle = false,
                                   isTyping = false,
                                   clickTriangle = null,

                                   className = '',
                                 }) {
  // options가 실제로 존재하는지 여부(렌더링/클래스 분기 기준)
  const hasOptions = Array.isArray(options) && options.length > 0;

  // 옵션 개수에 따라 말풍선(2개/3개) 마스크 클래스 결정
  const optionBoxClass = useMemo(() => {
    if (!hasOptions) return '';
    return options.length >= 3 ? 'option-box-large' : 'option-box-small';
  }, [hasOptions, options.length]);

  // 본문 텍스트를 라인 단위로 메모이즈(개행 유지)
  const lines = useMemo(() => splitLines(contentText), [contentText]);

  return (
    // subtitle-root는 전체 오버레이(포인터 기본 none)이며 className으로 추가 스타일 확장
    <div className={`subtitle-root ${className}`}>
      {/* nameText가 있을 때만 이름 박스 렌더링 */}
      {!!nameText && (
        <div className="name-box" style={{ backgroundColor: nameColor }}>
          <div className="name-text" style={{ color: nameTextColor }}>
            {nameText}
          </div>
        </div>
      )}

      {/* content-wrap은 마스크 없는 래퍼로 삼각형이 잘리지 않게 보호 */}
      <div className="content-wrap">
        {/* content-box는 마스크 적용 대상(말풍선 본체) */}
        <div
          className="content-box"
          style={{
            backgroundColor: COLORS.subtitle.contentBox,
          }}
        >
          {/* content-text는 PSD 기준 위치/크기 영역에 텍스트를 고정 */}
          <div className="content-text" style={{ color: contentTextColor }}>
            {/* 라인 단위 렌더링 + 하이라이트 적용 */}
            {lines.map((ln, i) => (
              <div key={i} style={{ display: 'block' }}>
                {applyHighlightsToLine(ln, highlights)}
              </div>
            ))}
            {/* 타이핑 중이면 커서 표시(삼각형은 숨김) */}
            {isTyping && <span className="typing-cursor">|</span>}
          </div>
        </div>

        {/* 삼각형 버튼은 content-box 형제로 둬서 마스크에 안 잘리게 처리 */}
        {showTriangle && !isTyping && (
          <button
            type="button"
            className="triangle-btn"
            aria-label="다음"
            style={{
              backgroundColor: COLORS.subtitle.arrow,
              cursor: typeof clickTriangle === 'function' ? 'pointer' : 'default',
            }}
            onClick={() => {
              // 클릭 핸들러가 함수일 때만 실행(안전)
              if (typeof clickTriangle === 'function') clickTriangle();
            }}
          />
        )}
      </div>

      {/* options가 있으면 옵션 말풍선 렌더링(비활성 시 pointerEvents 차단) */}
      {hasOptions && (
        <div
          className={`option-box ${optionBoxClass}`}
          style={{ backgroundColor: COLORS.subtitle.optionBox }}
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
