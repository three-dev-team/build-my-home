import { motion, AnimatePresence } from 'framer-motion';

/**
 * @param {ReactNode} children - 전환될 화면 컨텐츠
 * @param {any} stageKey - 스테이지 번호나 이름 (값이 바뀔 때마다 애니메이션 트리거)
 */

export default function FadeBlurTransition({ children, stageKey }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        background: 'white',
        overflow: 'hidden',
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={stageKey}
          initial={{
            opacity: 0,
            filter: 'blur(20px) brightness(2)',
            scale: 1.05,
          }}
          animate={{
            opacity: 1,
            filter: 'blur(0px) brightness(1)',
            scale: 1,
          }}
          exit={{
            opacity: 0,
            filter: 'blur(20px) brightness(2)',
            scale: 0.95,
          }}
          transition={{
            duration: 0.8,
            ease: 'easeInOut',
          }}
          style={{ width: '100%', height: '100%' }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
