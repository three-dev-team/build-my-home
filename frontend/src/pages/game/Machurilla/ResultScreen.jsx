import { motion, AnimatePresence } from 'framer-motion';

const RESULT_MESSAGES = {
  MONEY: {
    UP: {
      emoji: '💰',
      title: '금전운 상승!',
      message: '오오...! 황금빛 기운이 당신의 주머니로 쏟아지고 있어요! 벨이 두 배로 불어나는 기적이 일어났습니다!',
    },
    DOWN: {
      emoji: '💸',
      title: '금전운 하락...',
      message: '이럴 수가... 당신의 주머니가 텅 비어버리는 불길한 예감이... 아쉽지만 모든 벨이 연기처럼 사라졌습니다.',
    },
  },
  PROPERTY: {
    UP: {
      emoji: '🏠',
      title: '재산운 상승!',
      message: '당신의 보금자리에 새로운 기운이 깃듭니다! 뚝딱뚝딱... 집이 한 단계 더 멋지게 변했군요!',
    },
    DOWN: {
      emoji: '🏚️',
      title: '재산운 하락...',
      message: '세상에... 집터의 기운이 흔들리고 있어요. 아쉽게도 집이 한 단계 작아지는 시련을 겪게 되겠군요.',
    },
  },
  HEALTH: {
    UP: {
      emoji: '💪',
      title: '건강운 상승!',
      message: '당신에게서 넘치는 활력이 느껴집니다! 그 에너지를 모아 주사위를 한 번 더 던져보세요!',
    },
    DOWN: {
      emoji: '😴',
      title: '건강운 하락...',
      message:
        '이런... 몸이 천근만근 무거워 보여요. 잠시 쉬어가는 지혜가 필요할 때입니다. 다음 차례는 꿈나라에서 보내시길...',
    },
  },
  FRIENDSHIP: {
    UP: {
      emoji: '🎁',
      title: '우정운 상승!',
      message: '진정한 우정은 나눔에서 시작되는 법... 당신의 선의가 다른 이들을 행복하게 할 것입니다.',
    },
    DOWN: {
      emoji: '💝',
      title: '우정운 하락...',
      message:
        '타인의 기운을 강제로 뺏는 것은 운명의 흐름을 거스르는 일... 당신의 주머니는 채워지나 주변의 시선은 차가워집니다.',
    },
  },
};

const ResultScreen = ({ result }) => {
  const [cardType, direction] = result?.split('_') || ['MONEY', 'UP'];
  const data = RESULT_MESSAGES[cardType]?.[direction] || RESULT_MESSAGES.MONEY.UP;

  // 상승이면 황금색 빛, 하락이면 보라색/검은색 그림자 효과
  const themeColor = direction === 'UP' ? 'rgba(253, 224, 71, 0.6)' : 'rgba(168, 85, 247, 0.6)';

  return (
    <motion.div
      initial={{ scale: 0.5, opacity: 0, rotate: -5 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      className="bg-purple-900 rounded-3xl p-10 max-w-xl text-center shadow-[0_0_60px_-15px_rgba(0,0,0,0.3)] border-4 border-yellow-400 relative"
      style={{ boxShadow: `0 0 40px ${themeColor}` }}
    >
      {/* 운세 결과 아이콘 애니메이션 */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, type: 'spring' }}
        className="text-8xl mb-6 filter drop-shadow-lg"
      >
        {data.emoji}
      </motion.div>

      {/* 타이틀: 위아래로 살짝 흔들리는 효과 */}
      <motion.h2
        animate={{ y: [0, -5, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="text-4xl font-black mb-6 text-yellow-300 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]"
      >
        {data.title}
      </motion.h2>

      {/* 메시지: 타이핑 효과 느낌으로 등장 */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-xl text-purple-100 leading-relaxed mb-10 font-medium"
      >
        {data.message}
      </motion.p>

      {/* 하단 로딩바 (5초 타이머 시각화) */}
      <div className="w-full h-2 bg-purple-950 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: 5, ease: 'linear' }}
          className="h-full bg-yellow-400"
        />
      </div>
      <p className="text-sm text-purple-300 mt-2 italic">운명이 기록되고 있습니다...</p>
    </motion.div>
  );
};

export default ResultScreen;
