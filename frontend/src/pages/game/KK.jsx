// KK.jsx
import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGameTimer } from '../../hooks/useGameTimer.js';
import { KK_CONFIG, KK_MOOD_CONFIG, KK_SONGS } from '../../constants/kkData.js';
import { useExitHandler } from '../../hooks/useExitHandler.js';

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

  // 서버에서 계산한 현재 재생되는 노래 정보
  const currentPlayingSong = KK_SONGS.find((s) => s.id === player?.actionData);
  const currentMood = currentPlayingSong ? KK_MOOD_CONFIG[currentPlayingSong.mood] : null;
  const [pendingSong, setPendingSong] = useState(null);
  const audioRef = useRef(null);

  const ENTRY_FEE = KK_CONFIG.ENTRY_FEE;
  const loanAmount = ENTRY_FEE - userBell;

  const { timeLeft, isUrgent, hasTimeOutPanel } = useGameTimer(
    step === MODE.SELECT || step === MODE.LOAN ? timeoutSeconds : 0,
  );

  // 노래 선택 클릭
  const handleSelectSong = (song) => {
    if (!isMyTurn) return;

    if (userBell < ENTRY_FEE) {
      // 벨 부족 → 대출 확인 화면으로
      setPendingSong(song);
      onAction('SET_STEP', { uiStep: MODE.LOAN });
    } else {
      // 벨 충분 → 바로 재생
      confirmSelectSong(song);
    }
  };

  // 대출 확인 후 진행
  const confirmSelectSong = (song) => {
    onAction('KK_ACTION', { actionData: song.id });
  };

  const handleExit = useExitHandler(isMyTurn, onExit);
  const handleSkip = () => {
    if (audioRef.current) audioRef.current.pause();
    handleExit();
  };

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
      {/* 타이머 - 상단 중앙 */}
      {hasTimeOutPanel && (step === MODE.SELECT || step === MODE.LOAN) && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-white/80 px-6 py-2 rounded-full">
          <span className={`text-3xl font-bold ${isUrgent ? 'text-red-500' : 'text-gray-800'}`}>{timeLeft}s</span>
        </div>
      )}

      {/* 노래 선택 모드 */}
      {step === MODE.SELECT && (
        <div
          className="relative w-full max-w-[1400px] aspect-[2.5/1] transform scale-[1.3] origin-bottom mb-[-120px]"
          style={{
            backgroundImage: "url('/images/bubble_select.webp')",
            backgroundSize: 'contain',
            backgroundPosition: 'bottom center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          {/* 말풍선 내부 컨텐츠 */}
          <div className="absolute inset-0 flex items-center justify-center px-32 pb-16">
            {/* 왼쪽: KK 대사 */}
            <div className="flex-1">
              <p className="text-2xl text-gray-800 leading-relaxed">
                안녕, {currentPlayerName}.<br />
                기분에 맞는 노래를 골라보겠어?
                <br />
                공연료는 {ENTRY_FEE}벨이라구.
              </p>
            </div>

            {/* 오른쪽: 노래 선택 버튼 */}
            <div className="flex flex-col gap-2">
              {KK_SONGS.map((song) => (
                <button
                  key={song.id}
                  onClick={() => handleSelectSong(song)}
                  disabled={!isMyTurn}
                  className={'px-6 py-2 rounded-full text-lg font-bold transition-all'}
                >
                  {song.title}
                </button>
              ))}
              {/* 2. 랜덤 버튼 */}
              <button
                onClick={() => handleSelectSong({ id: 0, title: '랜덤' })} // id를 0으로 보냄
                disabled={!isMyTurn}
                className={'px-6 py-2 rounded-full text-lg font-bold transition-all'}
              >
                랜덤으로 골라줘!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 대출 확인 모드 */}
      {step === MODE.LOAN && (
        <div
          className="relative w-full max-w-[1400px] aspect-[2.5/1] transform scale-[1.3] origin-bottom mb-[-120px]"
          style={{
            backgroundImage: "url('/images/bubble_select.webp')",
            backgroundSize: 'contain',
            backgroundPosition: 'bottom center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          {/* 말풍선 내부 컨텐츠 */}
          <div className="absolute inset-0 flex items-center justify-center px-32 pb-16">
            {/* 왼쪽: KK 대사 */}
            <div className="flex-1">
              <p className="text-2xl text-gray-800 leading-relaxed">
                앗... {currentPlayerName}....
                <br />
                벨이 부족한 거 같네...
                <br />
                너굴씨에게 {loanAmount}벨 대출금 올려놓을게.
              </p>
            </div>

            {/* 오른쪽: 확인 버튼 */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => confirmSelectSong(pendingSong)}
                disabled={!isMyTurn}
                className="px-6 py-2 rounded-full text-lg font-bold bg-[#FFF8DC] hover:bg-[#FFE4B5] border-2 border-[#DEB887]"
              >
                좋아! 알았어!
              </button>
              <button
                onClick={() => confirmSelectSong(pendingSong)}
                disabled={!isMyTurn}
                className="px-6 py-2 rounded-full text-lg font-bold bg-[#FFF8DC] hover:bg-[#FFE4B5] border-2 border-[#DEB887]"
              >
                어쩔수 없지...
              </button>
            </div>
          </div>
        </div>
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
