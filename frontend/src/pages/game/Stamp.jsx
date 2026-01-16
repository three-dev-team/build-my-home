import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const Stamp = ({
  initialCount = 0,
  isActivePlayer = false, // 현재 8번 칸에 도착한 주인공인지 여부
  activePlayerName = "알 수 없음",
  onReward,
  onExit,
  onStampClick, // 주인공이 버튼을 눌렀을 때 서버로 보낼 이벤트
}) => {
  const [displayStamps, setDisplayStamps] = useState(initialCount);
  const [isAnimating, setIsAnimating] = useState(false);
  const [rewardMsg, setRewardMsg] = useState("");

  const [hasActionStarted, setHasActionStarted] = useState(false); // 도장 찍기 액션 실행 여부

  const stampConfig = [
    {
      id: 1,
      color: "bg-[#fef9e7]",
      label: "20벨",
      reward: 20,
      image: "/images/stamp-20.png?v=2",
    },
    {
      id: 2,
      color: "bg-[#fef9e7]",
      label: "40벨",
      reward: 40,
      image: "/images/stamp-40.png?v=2",
    },
    {
      id: 3,
      color: "bg-[#fef9e7]",
      label: "60벨",
      reward: 60,
      image: "/images/stamp-60.png?v=2",
    },
    {
      id: 4,
      color: "bg-[#fef9e7]",
      label: "100벨",
      reward: 100,
      image: "/images/stamp-100.png?v=2",
    },
  ];

  // 도장 찍기 연출 함수 (주인공이 누르거나, 서버에서 신호를 받았을 때 실행)
  const handleStampAction = () => {
    if (hasActionStarted) return;
    setHasActionStarted(true);

    const nextCount = initialCount + 1;
    if (nextCount <= 4) {
      setDisplayStamps(nextCount);
      setIsAnimating(true);
      const currentTarget = stampConfig[nextCount - 1];

      setTimeout(() => {
        setRewardMsg(
          `🎉 ${currentTarget.label} 스탬프! ${currentTarget.reward}벨 획득!`
        );
        if (isActivePlayer && onReward) onReward(currentTarget.reward);

        // 3초 후 자동 퇴장 (사용자 요청)
        setTimeout(() => {
          if (onExit) onExit();
        }, 3000);
      }, 500);
    }
  };

  // 1. 입장 후 5초 동안 입력 없으면 자동 실행
  useEffect(() => {
    if (hasActionStarted) return; // 이미 실행됐으면 패스

    const autoStampTimer = setTimeout(() => {
      console.log(">>> [Stamp] 5초 경과: 자동 도장 찍기 실행");
      // 액션이 아직 시작 안 됐으면 강제 실행
      // (주인공일 때만 서버로 신호 보내기 위해 onStampClick 호출 필요시 추가 검토,
      //  여기선 연출만 자동 실행하고 실제 데이터 처리는 onStampClick에 위임하거나,
      //  단순 연출 후 퇴장 처리)

      // 만약 주인공이라면 서버에도 알려야 하므로 onStampClick 호출
      if (isActivePlayer && onStampClick) {
        onStampClick();
      }
      handleStampAction();
    }, 5000);

    return () => clearTimeout(autoStampTimer);
  }, [hasActionStarted, isActivePlayer, onStampClick]);

  // handleStampAction 내부에서 3초 후 퇴장 처리할 것이므로 여기선 별도 타이머 없음

  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#34495e]/80 backdrop-blur-sm flex items-center justify-center font-gaegu z-[100] px-4 overflow-hidden">
      {/* 배경 반짝이 효과 (기존과 동일) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(10)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: "100vh", opacity: [0, 1, 0] }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              delay: i * 0.5,
            }}
            className="absolute text-white text-2xl"
            style={{ left: `${Math.random() * 100}%` }}
          >
            ✨
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ scale: 0.8, rotate: -5, opacity: 0 }}
        animate={{ scale: 1, rotate: -2, opacity: 1 }}
        className="relative w-full max-w-2xl p-8 md:p-12 bg-[#fdfdfd] rounded-[50px] border-[15px] border-[#e6f5c5] shadow-[0_20px_50px_rgba(0,0,0,0.3)] text-[#5a4a42]"
      >
        {/* 헤더 */}
        <div className="text-center mb-10">
          <h2 className="text-5xl font-bold mb-2 text-[#82ccdd]">
            스탬프 집 방문왕
          </h2>
          <div className="h-2 w-32 bg-[#82ccdd] mx-auto rounded-full opacity-30" />
        </div>

        {/* 상단 안내 & 너굴 */}
        <div className="flex justify-between items-end mb-12 px-4">
          <div className="flex flex-col gap-2">
            <p className="text-3xl leading-snug">
              {isActivePlayer ? (
                <>
                  어서오시게구리!
                  <br />
                  어서 버튼을 눌러 도장을{" "}
                  <span className="text-[#5eb347] font-bold">쾅!</span>
                </>
              ) : (
                <>
                  <span className="text-[#82ccdd] font-bold">
                    {activePlayerName}
                  </span>{" "}
                  님이
                  <br />
                  도장을 찍는 중이다구리!
                </>
              )}
            </p>
          </div>
          <img
            src="/images/tom-nook-happy.png"
            alt="너굴"
            className="w-32 h-32 object-contain animate-bounce-slow"
          />
        </div>

        {/* 보상 알림 */}
        <AnimatePresence>
          {rewardMsg && (
            <motion.div
              initial={{ y: 20, opacity: 0, scale: 0.5 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              className="absolute top-[40%] left-1/2 -translate-x-1/2 z-50 bg-white border-4 border-[#fbc531] px-10 py-4 rounded-full shadow-2xl"
            >
              <p className="text-3xl font-bold text-[#5a4a42] whitespace-nowrap">
                {rewardMsg}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 스탬프 그리드 (기존 동일) */}
        <div className="relative flex justify-between items-center px-6 py-12 bg-[#f0f9eb] rounded-[40px] border-4 border-dashed border-[#ccd9aa]">
          <div className="absolute top-1/2 left-[10%] right-[10%] h-1 bg-[#ccd9aa] opacity-50 -translate-y-1/2" />
          {stampConfig.map((config) => {
            const isStamped = config.id <= displayStamps;
            const isJustStamped = config.id === displayStamps && isAnimating;
            const isNext = config.id === initialCount + 1 && !isStamped;
            return (
              <div
                key={config.id}
                className="relative z-10 flex flex-col items-center gap-4"
              >
                <div
                  className={`w-28 h-28 flex items-center justify-center transition-all duration-500
                                    ${
                                      isStamped
                                        ? "bg-transparent scale-110"
                                        : "bg-[#e0e0e0] border-4 border-[#ccc] rounded-full"
                                    }
                                    ${
                                      isNext
                                        ? "ring-8 ring-[#fbc531] ring-opacity-40 animate-pulse scale-110 rounded-full"
                                        : ""
                                    }`}
                >
                  {isStamped ? (
                    <div
                      className={`w-full h-full flex items-center justify-center ${
                        isJustStamped ? "animate-stamp-slam" : ""
                      }`}
                    >
                      <img
                        src={config.image}
                        alt={config.label}
                        className="w-full h-full object-contain drop-shadow-xl"
                      />
                      {isJustStamped && (
                        <div className="absolute inset-0 bg-white/50 rounded-full animate-puff-out" />
                      )}
                    </div>
                  ) : (
                    <span className="text-4xl text-[#bbb] font-bold">
                      {config.id}
                    </span>
                  )}
                </div>
                <span
                  className={`text-xl font-bold ${
                    isStamped ? "text-[#5a4a42]" : "text-[#bbb]"
                  }`}
                >
                  {config.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* 하단 버튼 영역 */}
        <div className="mt-10 flex flex-col items-center gap-4">
          {isActivePlayer ? (
            // 주인공만 누를 수 있는 버튼
            !hasActionStarted ? (
              <button
                onClick={() => {
                  onStampClick();
                  handleStampAction();
                }}
                className="px-12 py-4 bg-[#5eb347] hover:bg-[#4a9e36] text-white rounded-full text-3xl shadow-[0_6px_0_#3e7d2a] active:translate-y-1 active:shadow-none transition-all font-bold"
              >
                도장 쾅 찍기!
              </button>
            ) : (
              <p className="text-[#a0a0a0] text-2xl">잠시 후 복귀합니다...</p>
            )
          ) : (
            // 관전자는 버튼 없이 대기 메시지만
            <div className="flex flex-col items-center">
              <div className="flex gap-2 mb-2">
                <motion.div
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="w-3 h-3 bg-[#82ccdd] rounded-full"
                />
                <motion.div
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                  className="w-3 h-3 bg-[#82ccdd] rounded-full"
                />
                <motion.div
                  animate={{ scale: [1, 1.5, 1] }}
                  transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                  className="w-3 h-3 bg-[#82ccdd] rounded-full"
                />
              </div>
              <p className="text-[#82ccdd] text-2xl font-bold">
                선택을 기다리는 중...
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Stamp;
