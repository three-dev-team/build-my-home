import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { useGameTimer } from '../../hooks/useGameTimer.js';
import { boardTiles } from '../../constants/boardData.js';
import './css/Stamp.css';

const STAMP_CONFIG = {
  GAPDOL: { name: '갑돌섬', npcName: '갑돌이', image: '/images/stamp-gapdol.png' },
  MUSEUM: { name: '박물관', npcName: '부엉이', image: '/images/stamp-museum.png' },
  AIRPORT: { name: '비행장', npcName: '모리', image: '/images/stamp-airport.png' },
};

const DUPLICATE_REWARD = 20;

const Stamp = ({ isMyTurn = false, player, currentPlayerName = '익명의 주민', onAction, onExit }) => {
  // position으로 stampType 계산
  const position = player?.position || 0;
  const tile = boardTiles.find((t) => t.id === position);
  const stampType = tile?.type?.replace('STAMP_', '') || 'GAPDOL';

  const step = player?.uiStep || 0;
  const config = STAMP_CONFIG[stampType] || STAMP_CONFIG.GAPDOL;

  const collectedStamps = player?.collectedStamps || [];
  const isDuplicate = player?.actionData === 0; // 0: 중복, 1: 신규

  // 자동 나가기 처리 (중복 방지)
  // TODO: 프론트 타이머 대신 서버 타임아웃 방식으로 변경 필요 - Tiffany
  const hasExited = useRef(false);
  const handleExit = () => {
    if (hasExited.current) return;
    hasExited.current = true;
    onExit();
  };

  // step 2에서 3초 후 자동 나가기
  useGameTimer(step === 2 ? 3 : 0, handleExit);

  const setStep = (newStep) => {
    if (!isMyTurn) return;
    onAction('SET_STEP', { uiStep: newStep });
  };

  // 도장 쾅 버튼 클릭 (uiStep 1 → 2 + 스탬프 획득)
  const handleStamp = () => {
    if (!isMyTurn) return;
    onAction('STAMP_COLLECT', { actionDataStr: stampType });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 w-screen h-screen flex flex-col items-center justify-center z-[100] overflow-hidden bg-green-200"
    >
      {/* uiStep 0: NPC 인사 */}
      {step === 0 && (
        <div className="relative bg-[#FFF8DC] rounded-3xl p-12 max-w-xl text-center shadow-2xl">
          <h2 className="text-4xl font-bold mb-8 text-green-600">{config.npcName}</h2>
          <p className="text-2xl leading-relaxed">
            {currentPlayerName} 반가워!
            <br />
            {config.name}에 온 걸 환영해
            <br />
            방문카드를 주면 스탬프를 찍어줄게!
          </p>

          {/* 삼각형 다음 버튼 */}
          <div className="flex justify-center">
            <button onClick={() => setStep(1)} disabled={!isMyTurn}>
              <svg width="32" height="20" viewBox="0 0 32 20" fill="#F4A460">
                <polygon points="16,20 0,0 32,0" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* uiStep 1: 방문카드 + 도장 쾅 버튼 */}
      {step === 1 && (
        <div className="bg-[#FFF8DC] rounded-3xl p-12 max-w-2xl text-center shadow-2xl">
          <h2 className="text-3xl font-bold mb-8">방문카드</h2>

          {/* 스탬프 현황 */}
          <div className="relative flex justify-between items-center px-6 py-12 bg-[#f0f9eb] rounded-[40px] border-4 border-dashed border-[#ccd9aa] mb-8">
            <div className="absolute top-1/2 left-[10%] right-[10%] h-1 bg-[#ccd9aa] opacity-50 -translate-y-1/2" />

            {Object.entries(STAMP_CONFIG).map(([type, cfg]) => {
              const isCollected = collectedStamps.includes(type);

              return (
                <div key={type} className="relative z-10 flex flex-col items-center gap-4">
                  <div
                    className={`w-28 h-28 flex items-center justify-center transition-all duration-500
                                            ${
                                              isCollected
                                                ? 'bg-transparent scale-110'
                                                : 'bg-[#e0e0e0] border-4 border-[#ccc] rounded-full'
                                            }
                                        `}
                  >
                    {isCollected ? (
                      <img src={cfg.image} alt={cfg.name} className="w-full h-full object-contain drop-shadow-xl" />
                    ) : (
                      <span className="text-4xl text-[#bbb] font-bold">?</span>
                    )}
                  </div>
                  <span className={`text-xl font-bold ${isCollected ? 'text-[#5a4a42]' : 'text-[#bbb]'}`}>
                    {cfg.name}
                  </span>
                </div>
              );
            })}
          </div>

          {/* 도장 쾅 버튼 */}
          <button
            onClick={handleStamp}
            disabled={!isMyTurn}
            className={'px-12 py-4 rounded-full text-3xl font-bold transition-all'}
          >
            도장 쾅 찍기!
          </button>
        </div>
      )}

      {/* uiStep 2: 결과 화면 */}
      {step === 2 && (
        <div className="bg-[#FFF8DC] rounded-3xl p-12 max-w-2xl text-center shadow-2xl">
          <h2 className="text-3xl font-bold mb-8">방문카드</h2>

          {/* 스탬프 현황 (애니메이션 포함) */}
          <div className="relative flex justify-between items-center px-6 py-12 bg-[#f0f9eb] rounded-[40px] border-4 border-dashed border-[#ccd9aa] mb-8">
            <div className="absolute top-1/2 left-[10%] right-[10%] h-1 bg-[#ccd9aa] opacity-50 -translate-y-1/2" />

            {Object.entries(STAMP_CONFIG).map(([type, cfg]) => {
              const isCollected = collectedStamps.includes(type);
              const isJustStamped = type === stampType && !isDuplicate;

              return (
                <div key={type} className="relative z-10 flex flex-col items-center gap-4">
                  <div
                    className={`w-28 h-28 flex items-center justify-center transition-all duration-500
                                            ${
                                              isCollected
                                                ? 'bg-transparent scale-110'
                                                : 'bg-[#e0e0e0] border-4 border-[#ccc] rounded-full'
                                            }
                                        `}
                  >
                    {isCollected ? (
                      <div
                        className={`w-full h-full flex items-center justify-center ${isJustStamped ? 'animate-stamp-slam' : ''}`}
                      >
                        <img src={cfg.image} alt={cfg.name} className="w-full h-full object-contain drop-shadow-xl" />
                        {isJustStamped && (
                          <div className="absolute inset-0 bg-white/50 rounded-full animate-puff-out" />
                        )}
                      </div>
                    ) : (
                      <span className="text-4xl text-[#bbb] font-bold">?</span>
                    )}
                  </div>
                  <span className={`text-xl font-bold ${isCollected ? 'text-[#5a4a42]' : 'text-[#bbb]'}`}>
                    {cfg.name}
                  </span>
                </div>
              );
            })}
          </div>

          {/* 결과 메시지 */}
          {isDuplicate ? (
            <div className="bg-yellow-50 rounded-xl p-6 mb-6">
              <p className="text-xl">
                어라라.. 이미 찍혀있네..
                <br />
                아쉬우니까 <span className="font-bold text-yellow-600">{DUPLICATE_REWARD}벨</span>이라도 받아가!
                <br />
                다음에 또 만나~
              </p>
            </div>
          ) : (
            <div className="bg-green-50 rounded-xl p-6 mb-6">
              <p className="text-xl">
                스탬프를 찍었어!
                <br />
                다음에 또 만나~
              </p>
            </div>
          )}

          <p className="text-gray-400 text-lg">잠시 후 자동으로 닫힙니다...</p>
        </div>
      )}
    </motion.div>
  );
};

export default Stamp;
