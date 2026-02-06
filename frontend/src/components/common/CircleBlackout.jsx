import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";

export default function CircleBlackout({
                                         show,           // true: 커튼 등장, false: 커튼 제거
                                         type = "close",   // "close": 닫아서 암전, "open": 열어서 화면 공개
                                         duration = 1500,   // 애니메이션 속도 (ms)
                                         color = "#000",   // 배경 색상
                                         onDone,           // 애니메이션이 완전히 끝났을 때 실행할 함수
                                       }) {
  const [viewport, setViewport] = useState({
    w: typeof window !== "undefined" ? window.innerWidth : 0,
    h: typeof window !== "undefined" ? window.innerHeight : 0,
  });

  // 브라우저 리사이즈 대응
  useEffect(() => {
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const cx = viewport.w / 2;
  const cy = viewport.h / 2;

  // 화면 대각선 길이를 계산해 원이 화면 전체를 덮을 수 있는 반지름(maxR) 구함
  const maxR = useMemo(() => {
    return Math.ceil(Math.sqrt(cx * cx + cy * cy)) + 10;
  }, [cx, cy]);

  // show가 false면 아무것도 렌더링하지 않음
  if (!show) return null;

  // [중요] 애니메이션 설정
  // close: 큰 구멍(maxR)에서 0으로 작아짐 (화면이 가려짐)
  // open: 0에서 큰 구멍(maxR)으로 커짐 (화면이 보임)
  const initialR = type === "close" ? maxR : 0;
  const animateR = type === "close" ? 0 : maxR;

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999999,
        // 닫힐 때는 클릭을 막고, 열릴 때는 클릭이 투과되도록 설정
        pointerEvents: type === "close" ? "auto" : "none",
        backgroundColor: "transparent",
      }}
    >
      <svg width="100%" height="100%" style={{ display: "block" }}>
        <defs>
          <mask id="circle-blackout-mask">
            {/* 기본 배경: 흰색 (마스크에서 흰색은 '보이는 영역'을 의미) */}
            <rect width="100%" height="100%" fill="white" />

            {/* 애니메이션 원: 검은색 (마스크에서 검은색은 '구멍 뚫리는 영역'을 의미) */}
            <motion.circle
              cx={cx}
              cy={cy}
              fill="black"
              initial={{ r: initialR }}
              animate={{ r: animateR }}
              transition={{
                duration: duration / 1000,
                ease: [0.65, 0, 0.35, 1], // 부드러운 가속도 곡선
              }}
              onAnimationComplete={onDone}
            />
          </mask>
        </defs>

        {/* 실제 검정색 레이어에 위에서 만든 마스크를 입힘 */}
        <rect
          width="100%"
          height="100%"
          fill={color}
          mask="url(#circle-blackout-mask)"
        />
      </svg>
    </div>,
    document.body
  );
}
