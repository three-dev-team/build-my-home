import React from 'react';

/**
 * AspectLayout
 *
 * 브라우저 창 크기와 상관없이 항상 16:9 비율을 유지하는 컨테이너입니다.
 * 내부 요소들은 이 컨테이너를 기준으로 `cqw`, `cqh` 단위를 사용하여
 * 정확한 비율로 배치될 수 있습니다.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {string} [props.className]
 */
export default function AspectLayout({ children, className = '' }) {
  return (
    // 1. 전체 화면 배경 (레터박스 역할)
    <div className="w-screen h-screen bg-black flex items-center justify-center overflow-hidden">
      {/* 2. 16:9 고정 컨테이너 */}
      <div
        className={`relative w-full max-w-[177.78vh] aspect-video overflow-hidden shadow-2xl ${className}`}
        style={{
          // Container Query 설정: 내부에서 @container 규칙 및 cqw, cqh 단위 사용 가능
          containerType: 'size',
        }}
      >
        {children}
      </div>
    </div>
  );
}
