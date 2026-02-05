import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

export default function CircleBlackout({
                                         open,
                                         mode = "in", // "in": 닫힘(Iris-in), "out": 열림(Iris-out)
                                         center,
                                         durationMs = 550,
                                         color = "#000",
                                         zIndex = 9999,
                                         blockInput = true,
                                         onDone,
                                       }) {
  const doneRef = useRef(false);

  const [viewport, setViewport] = useState(() => ({
    w: typeof window !== "undefined" ? window.innerWidth : 0,
    h: typeof window !== "undefined" ? window.innerHeight : 0,
  }));

  useEffect(() => {
    if (!open) return;
    doneRef.current = false;
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open]);

  const cx = center?.x ?? Math.floor(viewport.w / 2);
  const cy = center?.y ?? Math.floor(viewport.h / 2);

  const maxR = useMemo(() => {
    const dx = Math.max(cx, viewport.w - cx);
    const dy = Math.max(cy, viewport.h - cy);
    return Math.ceil(Math.sqrt(dx * dx + dy * dy));
  }, [cx, cy, viewport.w, viewport.h]);

  const dur = Math.max(0, durationMs) / 1000;
  const ease = [0.22, 1, 0.36, 1];

  const finishOnce = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone?.();
  };

  if (!open) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="circle-blackout"
          className="fixed inset-0"
          style={{
            zIndex,
            pointerEvents: blockInput ? "auto" : "none",
          }}
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <svg width="100%" height="100%" style={{ display: "block" }}>
            <defs>
              <mask id="circle-iris-mask">
                {/* 배경: In일 때는 흰색(보임), Out일 때는 검정(가림) */}
                <rect
                  width="100%"
                  height="100%"
                  fill={mode === "in" ? "white" : "black"}
                />

                {/* 애니메이션 원: In일 때는 검정(구멍 닫기), Out일 때는 흰색(구멍 열기) */}
                <motion.circle
                  cx={cx}
                  cy={cy}
                  r={maxR}
                  fill={mode === "in" ? "black" : "white"}
                  initial={{ scale: mode === "in" ? 1 : 0 }}
                  animate={{ scale: mode === "in" ? 0 : 1 }}
                  transition={{ duration: dur, ease }}
                  style={{ transformOrigin: `${cx}px ${cy}px` }}
                  onAnimationComplete={finishOnce}
                />
              </mask>
            </defs>

            {/* 마스크가 적용된 레이어 */}
            <rect
              width="100%"
              height="100%"
              fill={color}
              mask="url(#circle-iris-mask)"
            />
          </svg>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
