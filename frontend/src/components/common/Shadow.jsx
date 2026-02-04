import "./Shadow.css";

/**
 * 그림자만 제공하는 공통 컴포넌트
 *
 * 사용:
 * <CharacterShadow>
 *   <img ... />
 * </CharacterShadow>
 */
export default function Shadow({ children, lift = 0 }) {
  return (
    <div className="char-shadow-wrap">
      <div className="char-shadow" />
      <div
        className="char-shadow-content"
        style={{ transform: `translateY(${-lift}px)` }}
      >
        {children}
      </div>
    </div>
  );
}
