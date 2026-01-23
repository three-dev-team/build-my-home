// frontend/src/pages/game/Result.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CHARACTERS } from '../../constants/characters.js';
import confetti from 'canvas-confetti';

const TONE = {
  brownText: 'text-[#4b3a2e]',
  brownText2: 'text-[#6a5342]',
  cardBg: 'bg-[#f7f0e4]',
  innerBg: 'bg-[#fff8ea]',
  border: 'border-[#d6b98a]',
  borderSoft: 'border-[#ead7b8]',
  chipBg: 'bg-[#efe2c8]',
  greenBtn: 'bg-[#7bb46b] hover:bg-[#6aa65a] border-[#5a8f4e]',
};

const CHARACTER_IMG_MAP = CHARACTERS.reduce((acc, char) => {
  acc[Number(char.id)] = char.selectBasicImage;
  return acc;
}, {});

const Result = ({ gameState, myId, onLeave }) => {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState(10);
  const [visibleRanks, setVisibleRanks] = useState([]);

  // 순위대로 정렬된 플레이어 리스트
  // gameState.players는 Map 형태이므로 배열로 변환 후 rank 기준 정렬
  const sortedPlayers = React.useMemo(() => {
    if (!gameState?.players) return [];
    return Object.values(gameState.players).sort((a, b) => a.rank - b.rank);
  }, [gameState]);

  // 4등부터 1등까지 순차적 등장 애니메이션
  useEffect(() => {
    if (sortedPlayers.length === 0) return;

    // 4등 -> 1등 순서 (rank 역순으로 스케줄링)
    // 예: 4명일 때 -> rank 4 (0초), rank 3 (1초), rank 2 (2초), rank 1 (3초)
    const maxRank = sortedPlayers.length;

    sortedPlayers.forEach((p) => {
      // 거꾸로 등장: delay = (maxRank - rank) * 1000ms
      // 4등(rank 4) -> 0초
      // 1등(rank 1) -> 3초
      const delay = (maxRank - p.rank) * 1200;

      setTimeout(() => {
        setVisibleRanks((prev) => [...prev, p.rank]);

        // 1등 등장 시 폭죽 효과
        if (p.rank === 1) {
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
          });
        }
      }, delay);
    });
  }, [sortedPlayers]);

  // 10초 카운트다운 및 자동 나가기
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          clearInterval(timer);
          onLeave(); // [Explicit Leave]
          setTimeout(() => navigate('/home'), 500); // 0.5초 뒤 이동 (메시지 전송 보장)
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center backdrop-blur-sm">
      <div
        className={[
          'w-full max-w-4xl max-h-[90vh] overflow-y-auto px-8 py-10 rounded-[50px]',
          TONE.cardBg,
          'border-[6px] shadow-[0_30px_100px_rgba(0,0,0,0.5)]',
          TONE.border,
        ].join(' ')}
      >
        {/* 헤더 */}
        <div className="text-center mb-10">
          <h1 className={`text-4xl sm:text-5xl font-black ${TONE.brownText} drop-shadow-sm mb-4`}>🎉 게임 종료 🎉</h1>
          <p className={`text-lg font-bold ${TONE.brownText2}`}>드디어 꿈꾸던 마이홈이 완성되었습니다!</p>
        </div>

        {/* 순위 리스트 (아래에서 위로 쌓이는 느낌 or 리스트 형태) */}
        <div className="flex flex-col gap-4 w-full max-w-2xl mx-auto">
          {sortedPlayers.map((player) => {
            const isVisible = visibleRanks.includes(player.rank);
            const isMe = Number(player.memberId) === Number(myId);
            const isWinner = player.rank === 1;

            return (
              <div
                key={player.memberId}
                className={[
                  'relative transition-all duration-700 ease-out transform',
                  isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-95',
                  'flex items-center p-4 rounded-[24px] border-[3px]',
                  isWinner
                    ? 'bg-gradient-to-r from-[#ffd700] to-[#fffacd] border-[#e6c200] shadow-[0_10px_30px_rgba(255,215,0,0.3)]'
                    : `${TONE.innerBg} ${TONE.borderSoft} shadow-md`,
                  isMe ? 'ring-4 ring-[#7bb46b]/50' : '',
                ].join(' ')}
              >
                {/* 등수 뱃지 */}
                <div
                  className={[
                    'w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center rounded-full mr-4 border-[3px] font-black text-xl sm:text-2xl shadow-inner',
                    isWinner
                      ? 'bg-white border-[#e6c200] text-[#e6c200]'
                      : 'bg-[#efe2c8] border-[#d6b98a] text-[#8a6e57]',
                  ].join(' ')}
                >
                  {player.rank}위
                </div>

                {/* 캐릭터 이미지 */}
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-white/50 bg-white mr-4 shrink-0">
                  <img
                    src={CHARACTER_IMG_MAP[player.characterId]}
                    alt={player.nickname}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* 정보 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className={`text-lg sm:text-xl font-black truncate ${TONE.brownText}`}>
                      {player.nickname}
                      {isMe && (
                        <span className="text-xs ml-2 px-2 py-0.5 rounded-full bg-[#7bb46b] text-white">나</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm font-bold text-[#8a6e57]">
                    <span>📉 대출금: {player.loan.toLocaleString()} bells</span>
                    <span className="w-[1px] h-3 bg-[#d6b98a]" />
                    <span>🏡 집 Level: {player.houseLevel}</span>
                    <span className="w-[1px] h-3 bg-[#d6b98a]" />
                    <span>💰 자산: {player.bell.toLocaleString()} bells</span>
                  </div>
                </div>

                {isWinner && <div className="absolute -top-4 -right-2 text-4xl animate-bounce">👑</div>}
              </div>
            );
          })}
        </div>

        {/* 하단 버튼 및 카운트다운 */}
        <div className="mt-12 text-center">
          <p className="text-[#8a6e57] font-bold mb-4 animate-pulse">{timeLeft}초 후 자동으로 나가지게 됩니다...</p>
          <button
            onClick={() => {
              onLeave(); // [Explicit Leave]
              setTimeout(() => navigate('/home'), 500);
            }}
            className={[
              'px-10 py-4 rounded-full font-black text-xl text-white shadow-[0_10px_20px_rgba(123,180,107,0.3)] transition transform active:scale-95',
              TONE.greenBtn,
            ].join(' ')}
          >
            나가기 🚪
          </button>
        </div>
      </div>
    </div>
  );
};

export default Result;
