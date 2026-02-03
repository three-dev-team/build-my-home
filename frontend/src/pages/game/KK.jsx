// KK.jsx
import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useGameTimer } from '../../hooks/useGameTimer.js';
import { KK_CONFIG, KK_MOOD_CONFIG, KK_SONGS } from '../../constants/kkData.js';
import { useExitHandler } from '../../hooks/useExitHandler.js';
import Subtitle from '../../components/common/Subtitle.jsx';
import { COLORS } from '../../constants/colors.js';

const KK = ({
  isMyTurn = false,
  player,
  currentPlayerName = '익명의 주민',
  userBell = 0,
  timeoutSeconds,
  onAction,
  onExit,
}) => {
  const MODE = { SELECT: 0, LOAN: 1, PLAYING: 2 };
  const step = player?.uiStep || 0;

  const currentPlayingSong = KK_SONGS.find((s) => s.id === player?.actionData);
  const currentMood = currentPlayingSong ? KK_MOOD_CONFIG[currentPlayingSong.mood] : null;
  const [pendingSong, setPendingSong] = useState(null);
  const audioRef = useRef(null);

  const ENTRY_FEE = KK_CONFIG.ENTRY_FEE;
  const loanAmount = ENTRY_FEE - userBell;

  const { timeLeft, isUrgent, hasTimeOutPanel } = useGameTimer(
    step === MODE.SELECT || step === MODE.LOAN ? timeoutSeconds : 0,
  );

  const handleSelectSong = (song) => {
    if (!isMyTurn) return;

    if (userBell < ENTRY_FEE) {
      setPendingSong(song);
      onAction('SET_STEP', { uiStep: MODE.LOAN });
    } else {
      confirmSelectSong(song);
    }
  };

  const confirmSelectSong = (song) => {
    onAction('KK_ACTION', { actionData: song.id });
  };

  const handleExit = useExitHandler(isMyTurn, onExit);
  const handleSkip = () => {
    if (audioRef.current) audioRef.current.pause();
    handleExit();
  };

  // 노래 선택 옵션 생성
  const songOptions = [
    ...KK_SONGS.map((song) => ({
      text: song.title,
      onClick: () => handleSelectSong(song),
    })),
    {
      text: '랜덤으로 골라줘!',
      onClick: () => handleSelectSong({ id: 0, title: '랜덤' }),
    },
  ];

  // 대출 확인 옵션
  const loanOptions = [
    {
      text: '좋아! 알았어!',
      onClick: () => confirmSelectSong(pendingSong),
    },
    {
      text: '어쩔수 없지...',
      onClick: () => confirmSelectSong(pendingSong),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 w-screen h-screen flex items-end justify-center z-[100] overflow-hidden"
      style={{
        backgroundImage:
          step === MODE.PLAYING && currentMood
            ? `url(${currentMood.image})`
            : "url('/images/kk-select-background.jpeg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* 타이머 */}
      {hasTimeOutPanel && (step === MODE.SELECT || step === MODE.LOAN) && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-white/80 px-6 py-2 rounded-full">
          <span className={`text-3xl font-bold ${isUrgent ? 'text-red-500' : 'text-gray-800'}`}>{timeLeft}s</span>
        </div>
      )}

      {/* 노래 선택 모드 */}
      {step === MODE.SELECT && (
        <Subtitle
          nameText="K.K."
          nameColor={COLORS.characters.kk.nameBox}
          nameTextColor={COLORS.characters.kk.nameText}
          contentText={`안녕, ${currentPlayerName}.\n기분에 맞는 노래를 골라보겠어?\n공연료는 ${ENTRY_FEE}벨이라구.`}
          highlights={[
            { text: currentPlayerName, color: COLORS.ac.nookCyan },
            { text: `${ENTRY_FEE}벨`, color: COLORS.ac.nookCyan },
          ]}
          options={songOptions}
          optionDisabled={!isMyTurn}
        />
      )}

      {/* 대출 확인 모드 */}
      {step === MODE.LOAN && (
        <Subtitle
          nameText="K.K."
          nameColor={COLORS.characters.kk.nameBox}
          nameTextColor={COLORS.characters.kk.nameText}
          contentText={`앗... ${currentPlayerName}....\n벨이 부족한 거 같네...\n너굴씨에게 ${loanAmount}벨 대출금 올려놓을게.`}
          highlights={[
            { text: currentPlayerName, color: COLORS.ac.nookCyan },
            { text: `${loanAmount}벨`, color: COLORS.ac.red },
          ]}
          options={loanOptions}
          optionDisabled={!isMyTurn}
        />
      )}

      {/* 재생 모드 */}
      {step === MODE.PLAYING && currentPlayingSong && (
        <div className="relative w-full h-full flex flex-col items-center justify-center">
          <div className="bg-black/50 px-8 py-4 rounded-full text-white text-3xl font-bold">
            🎵 {currentPlayingSong.title}
          </div>

          <audio ref={audioRef} src={currentPlayingSong.audio} autoPlay onEnded={handleExit} />

          <button
            onClick={handleSkip}
            className="absolute bottom-10 right-10 px-8 py-4 bg-white/20 hover:bg-white/40 text-white rounded-full text-2xl font-bold"
          >
            Skip
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default KK;
