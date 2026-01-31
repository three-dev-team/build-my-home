import React from 'react';
import './Subtitle.css';

/**
 * @param {string} nameText - 이름 박스 텍스트
 * @param {string} nameColor - 이름 박스 색상
 * @param {string} nameTextColor - 이름 텍스트 색상
 *
 * @param {string} contentText - 메인 박스 텍스트
 * @param {string} contentColor - 메인 박스 색상
 * @param {string} contentTextColor - 메인 텍스트 색상
 *
 * @param {string} optionText - 옵션 박스 텍스트
 * @param {string} optionColor - 옵션 박스 색상
 * @param {string} optionTextColor - 옵션 텍스트 색상
 *
 * @param {string} trianglePosition - 삼각형 위치 ('left' | 'center' | 'right')
 *
 * 사용 예시:
 * <Subtitle
 *   nameText="마추릴라"
 *   nameColor="#9B59B6"
 *   contentText="그렇다구리구리..."
 *   contentColor="#FFB6C1"
 *   optionText="돈이 없어!"
 *   optionColor="#FFB347"
 * />
 */
const Subtitle = ({
    // 이름 박스
    nameText,
    nameColor = '#9B59B6',
    nameTextColor = '#FFFFFF',

    // 메인 박스
    contentText,
    contentColor = '#FFB6C1',
    contentTextColor = '#333333',

    // 옵션 박스
    optionText,
    optionColor = '#FFB347',
    optionTextColor = '#FFFFFF',

    // 삼각형
    trianglePosition = 'center',
  }) => {
  // 옵션 텍스트 줄 수 감지
  const optionLines = optionText ? optionText.split('\n').length : 0;
  const isThreeLines = optionLines >= 3;

  return (
    <>
      {/* 이름 박스 */}
      <div className="name-box" style={{ backgroundColor: nameColor }}>
        <div className="name-text" style={{ color: nameTextColor }}>
          {nameText}
        </div>
      </div>

      {/* 메인 박스 */}
      <div className="content-box" style={{ backgroundColor: contentColor }}>
        <div className="content-text" style={{ color: contentTextColor }}>
          {contentText}
        </div>
      </div>

      {/* 옵션 박스 */}
      <div
        className={`option-box ${isThreeLines ? 'option-box-large' : 'option-box-small'}`}
        style={{ backgroundColor: optionColor }}
      >
        <div className="option-text" style={{ color: optionTextColor }}>
          {optionText}
        </div>
      </div>

      {/* 삼각형 */}
      <div className={`triangle triangle-${trianglePosition}`} style={{ backgroundColor: optionColor }}></div>
    </>
  );
};

export default Subtitle;
