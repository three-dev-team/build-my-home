import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

export default function CircleBlackout({
                                         open,
                                         mode = "in",
                                         center,
                                         durationMs = 550,
                                         color = "#000",
                                         zIndex = 9999,
                                         blockInput = true,
                                         onDone,

                                         loading = false,
                                         loadingImageSrc = "/images/common/icon-loading.png",
                                         showLoadingAfterMs = 180,
                                         loadingSize = 96,
                                       }) {
  // onDone이 같은 open 사이클에서 1번만 호출되도록 가드
  const doneRef = useRef(false);

  // 뷰포트 크기 추적(리사이즈 시 중심/반지름 재계산)
  const [viewport, setViewport] = useState(() => ({
    w: typeof window !== "undefined" ? window.innerWidth : 0,
    h: typeof window !== "undefined" ? window.innerHeight : 0,
  }));

  useEffect(() => {
    if (!open) return;

    // open될 때마다 onDone 1회 보장
    doneRef.current = false;

    // 리사이즈 시 뷰포트 갱신
    const onResize = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);

    return () => window.removeEventListener("resize", onResize);
  }, [open]);

  // 원의 중심점(미지정이면 화면 정중앙)
  const cx = center?.x ?? Math.floor(viewport.w / 2);
  const cy = center?.y ?? Math.floor(viewport.h / 2);

  // 화면 전체를 덮는 최대 반지름(중심에서 가장 먼 코너까지)
  const maxR = useMemo(() => {
    const dx = Math.max(cx, viewport.w - cx);
    const dy = Math.max(cy, viewport.h - cy);
    return Math.ceil(Math.sqrt(dx * dx + dy * dy));
  }, [cx, cy, viewport.w, viewport.h]);

  // framer-motion 전환 파라미터
  const dur = Math.max(0, durationMs) / 1000;
  const ease = [0.22, 1, 0.36, 1];

  // 애니메이션 완료 콜백(1회만 실행)
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
          {/* 원형 블랙아웃/원형 홀 마스크 */}
          <svg width="100%" height="100%" style={{ display: "block" }}>
            {mode === "in" ? (
              <>
                {/* mode=in: 검은 원이 커지며 화면을 덮음 */}
                <motion.circle
                  cx={cx}
                  cy={cy}
                  r={maxR}
                  fill={color}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: dur, ease }}
                  style={{ transformOrigin: `${cx}px ${cy}px` }}
                  onAnimationComplete={finishOnce}
                />
              </>
            ) : (
              <>
                {/* mode=out: 검정 화면 위에서 "구멍"이 커지며 화면이 드러남 */}
                <defs>
                  <mask id="circle-hole-mask">
                    {/* 마스크 기본값: 전체를 가림(black) */}
                    <rect width="100%" height="100%" fill="black" />
                    {/* 흰색 영역(white)이 보이는 구멍 */}
                    <motion.circle
                      cx={cx}
                      cy={cy}
                      r={maxR}
                      fill="white"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: dur, ease }}
                      style={{ transformOrigin: `${cx}px ${cy}px` }}
                      onAnimationComplete={finishOnce}
                    />
                  </mask>
                </defs>

                {/* 검정 오버레이 + 원형 홀 마스크 적용 */}
                <rect width="100%" height="100%" fill={color} mask="url(#circle-hole-mask)" />
              </>
            )}
          </svg>

          {/* 로딩 오버레이(옵션): 짧은 전환에서 깜빡임 방지용 딜레이 포함 */}
          {loading && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              style={{ pointerEvents: "none" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                delay: Math.max(0, showLoadingAfterMs) / 1000,
                duration: 0.15,
              }}
            >
              {/* 회전 로딩 이미지 */}
              <motion.img
                src={loadingImageSrc}
                alt="loading"
                draggable={false}
                style={{
                  width: loadingSize,
                  height: loadingSize,
                  userSelect: "none",
                }}
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
              />
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
