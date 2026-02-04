import './Shadow.css';

/**
 * 그림자만 제공하는 공통 컴포넌트
 *
 * 사용:
 * <CharacterShadow>
 *   <img ... />
 * </CharacterShadow>
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
    <div className="char-shadow-wrap">
      <div className="char-shadow" style={Object.keys(shadowStyle).length > 0 ? shadowStyle : undefined} />
      <div className="char-shadow-content" style={{ transform: `translateY(${-lift}px)` }}>
        {children}
      </div>
    </div>
  );
}
