import React, { useMemo, useRef, useState } from 'react';
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

  const audioRef = useRef(null);
  const [pendingSong, setPendingSong] = useState(null);
  const [randomBgKey, setRandomBgKey] = useState(null);

  const ENTRY_FEE = KK_CONFIG.ENTRY_FEE;
  const loanAmount = ENTRY_FEE - userBell;

  const { timeLeft, isUrgent, hasTimeOutPanel } = useGameTimer(
    step === MODE.SELECT || step === MODE.LOAN ? timeoutSeconds : 0,
  );

  const safeSongs = useMemo(() => {
    return (Array.isArray(KK_SONGS) ? KK_SONGS : []).filter(
      (s) => s && Number.isFinite(Number(s.id)) && s.title && s.audio,
    );
  }, []);

  const pickFrom = (arr) => {
    const list = Array.isArray(arr) ? arr : [];
    if (!list.length) return null;
    const idx = Math.floor(Math.random() * list.length);
    return list[idx] || null;
  };

  const songsBallad = useMemo(
    () => safeSongs.filter((s) => s.mood === 'ballad'),
    [safeSongs],
  );

  const songsHiphop = useMemo(
    () => safeSongs.filter((s) => s.mood !== 'ballad'),
    [safeSongs],
  );

  const currentPlayingSong = useMemo(() => {
    const actionId = Number(player?.actionData);
    if (!Number.isFinite(actionId)) return null;
    return safeSongs.find((s) => Number(s.id) === actionId) || null;
  }, [player?.actionData, safeSongs]);

  const handleExit = useExitHandler(isMyTurn, onExit);

  const confirmSelectSong = (song) => {
    if (!song) return;
    onAction('KK_ACTION', { actionData: song.id });
  };

  const handlePickCategory = (category) => {
    if (!isMyTurn) return;

    setRandomBgKey(null);

    const pickedSong =
      category === 'ballad' ? pickFrom(songsBallad) : pickFrom(songsHiphop);

    if (!pickedSong) return;

    if (userBell < ENTRY_FEE) {
      setPendingSong(pickedSong);
      onAction('SET_STEP', { uiStep: MODE.LOAN });
    } else {
      confirmSelectSong(pickedSong);
    }
  };

  const handleRandomPick = () => {
    if (!isMyTurn) return;

    const pickedSong = pickFrom(safeSongs);
    if (!pickedSong) return;

    const bgKeys = ['ballad', 'hiphop'];
    const bgIdx = Math.floor(Math.random() * bgKeys.length);
    const pickedBg = bgKeys[bgIdx] || 'ballad';
    setRandomBgKey(pickedBg);

    if (userBell < ENTRY_FEE) {
      setPendingSong(pickedSong);
      onAction('SET_STEP', { uiStep: MODE.LOAN });
    } else {
      confirmSelectSong(pickedSong);
    }
  };

  const handleSkip = () => {
    if (audioRef.current) audioRef.current.pause();
    setRandomBgKey(null);
    handleExit();
  };

  const loanOptions = [
    {
      text: '좋아! 알았어!',
      onClick: () => {
        const song = pendingSong || pickFrom(safeSongs);
        if (song) confirmSelectSong(song);
      },
    },
    {
      text: '어쩔수 없지...',
      onClick: () => {
        const song = pendingSong || pickFrom(safeSongs);
        if (song) confirmSelectSong(song);
      },
    },
  ];

  const songOptions = [
    {
      text: '발라드',
      onClick: () => handlePickCategory('ballad'),
    },
    {
      text: '힙합',
      onClick: () => handlePickCategory('hiphop'),
    },
    {
      text: '랜덤으로 골라줘!',
      onClick: handleRandomPick,
    },
  ];

  const playingBgImage = useMemo(() => {
    if (step !== MODE.PLAYING) return null;

    if (randomBgKey && KK_MOOD_CONFIG?.[randomBgKey]?.image) {
      return KK_MOOD_CONFIG[randomBgKey].image;
    }

    if (!currentPlayingSong) return null;

    const moodKey = currentPlayingSong.mood === 'ballad' ? 'ballad' : 'hiphop';
    if (KK_MOOD_CONFIG?.[moodKey]?.image) return KK_MOOD_CONFIG[moodKey].image;

    return null;
  }, [step, randomBgKey, currentPlayingSong]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 w-screen h-screen flex items-end justify-center z-[100] overflow-hidden"
      style={{
        backgroundImage:
          step === MODE.PLAYING && playingBgImage
            ? `url(${playingBgImage})`
            : "url('/images/kk-select-background.jpeg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {hasTimeOutPanel && (step === MODE.SELECT || step === MODE.LOAN) && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-white/80 px-6 py-2 rounded-full">
          <span className={`text-3xl font-bold ${isUrgent ? 'text-red-500' : 'text-gray-800'}`}>
            {timeLeft}s
          </span>
        </div>
      )}

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

      {step === MODE.PLAYING && currentPlayingSong && (
        <div className="relative w-full h-full flex flex-col items-center justify-center">
          <div className="bg-black/50 px-8 py-4 rounded-full text-white text-3xl font-bold">
            🎵 {currentPlayingSong.title}
          </div>

          <audio
            ref={audioRef}
            src={currentPlayingSong.audio}
            autoPlay
            onEnded={() => {
              setRandomBgKey(null);
              handleExit();
            }}
          />

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
