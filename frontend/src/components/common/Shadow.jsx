import './Shadow.css';

/**
 * 그림자만 제공하는 공통 컴포넌트
 *
 * @param {ReactNode} children - 그림자 위에 표시할 콘텐츠
 * @param {boolean} fill - true면 부모 크기에 맞춰 100% 확장 (캐릭터 영역처럼 고정 크기 부모 안에서 사용 시)
 * @param {number} lift - 콘텐츠를 위로 띄우는 px 값
 * @param {number|null} opacity - 그림자 투명도 (null이면 CSS 기본값)
 * @param {number} offsetY - 그림자 Y 위치 조절 (px)
 * @param {number|null} blur - 그림자 블러 (null이면 CSS 기본값 1px)
 * @param {number} scale - 그림자 크기 배율
 *
 * @example
 * // 기본 사용 (인라인 크기)
 * <Shadow>
 *   <img src={charImg} alt="캐릭터" />
 * </Shadow>
 *
 * // 부모 영역 꽉 채우기 (고정 크기 박스 안에서 사용)
 * <Shadow fill>
 *   <img src={charImg} alt="캐릭터" />
 * </Shadow>
 */
// export default function Shadow({ children, lift = 0 }) {
//   return (
//     <div className="char-shadow-wrap">
//       <div className="char-shadow" />
//       <div
//         className="char-shadow-content"
//         style={{ transform: `translateY(${-lift}px)` }}
//       >
//         {children}
//       </div>
//     </div>
//   );
// }

export default function Shadow({
                                 children,
                                 lift = 0,
                                 fill = false,
                                 opacity = null, // 기본값은 CSS에서 처리
                                 offsetY = 0, // 그림자 Y 위치 조절
                                 blur = null, // 기본값은 CSS의 1px
                                 scale = 1, // 그림자 크기
                               }) {
  const shadowStyle = {
    ...(opacity !== null && { opacity }),
    ...(offsetY !== 0 && { bottom: `${offsetY}px` }),
    ...(blur !== null && { filter: `blur(${blur}px)` }),
    ...(scale !== 1 && { transform: `translateX(-50%) scale(${scale})` }),
  };

  return (
    <div className={`char-shadow-wrap ${fill ? 'char-shadow-fill' : ''}`}>
      <div className="char-shadow" style={Object.keys(shadowStyle).length > 0 ? shadowStyle : undefined} />
      <div className={`char-shadow-content ${fill ? 'char-shadow-fill' : ''}`}
           style={{ transform: `translateY(${-lift}px)` }}>
        {children}
      </div>
    </div>
  );
}
