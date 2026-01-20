import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameTimer } from "../../hooks/useGameTimer.js";

/**
 * @param {number} userBell - 현재 유저 잔액
 * @param {number} userLoan - 현재 유저 대출금
 * @param {boolean} isMyTurn - 현재 조작 권한이 있는 유저인지
 * @param {string} currentPlayerName - 현재 은행을 이용 중인 유저의 이름
 * @param {boolean} isBankTile - 현재 위치가 '대출 칸'인지 여부 (false면 수수료 10% 추가)
 * @param {number} timeoutSeconds - 타이머 제한 시간 (초 단위)
 * @param {function} onAction - 서버 전송 함수
 * @param {function} onExit - 닫기 함수
 *
 */
const Loan = ({
  userBell = 0,
  userLoan = 0,
  currentPlayerName = "익명의 주민",
  isMyTurn = false,
  isBankTile = false,

  timeoutSeconds,
  onExit,

  // WebSocket Client
  stompClient,
  roomId,
}) => {
  const [amount, setAmount] = useState(10);
  const [mode, setMode] = useState("menu");
  const [feedbackMsg, setFeedbackMsg] = useState("");

  // 타이머 훅 사용 (보여주기용, 실제 타임아웃 액션 처리 X)
  const { timeLeft, isUrgent, hasTimeOutPanel } = useGameTimer(timeoutSeconds);

  if (timeoutSeconds === undefined) {
    console.log("데이터 기다리는 중...");
    return null;
  }

  if (!hasTimeOutPanel) return null;

  const handleConfirm = (type) => {
    if (!isMyTurn || !stompClient) return;

    setMode("processing");
    setTimeout(() => {
      if (type === "LOAN") {
        const feeText = !isBankTile ? " (수수료 10% 포함)" : "";

        // WebSocket 전송
        stompClient.publish({
          destination: "/app/loan/borrow",
          body: JSON.stringify({
            roomId: Number(roomId),
            amount: amount,
            isBankTile: isBankTile,
          }),
        });

        setFeedbackMsg(`${amount}벨 대출 완료!${feeText} 빚도 실력이다구리!`);
      } else {
        // 상환
        stompClient.publish({
          destination: "/app/loan/repay",
          body: JSON.stringify({
            roomId: Number(roomId),
            amount: userLoan, // 전액 상환
            isBankTile: isBankTile,
          }),
        });

        setFeedbackMsg(`정직하게 빚을 갚다니 대견하다구리!`);
      }
      setMode("success");
      setTimeout(onExit, 2500);
    }, 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 w-screen h-screen bg-[#2c3e50]/90 backdrop-blur-md flex items-center justify-center font-gaegu z-[100] overflow-hidden"
    >
      <div className="absolute top-8 w-full flex flex-col items-center gap-3">
        {/* -------- 타이머 -------- */}
        {(mode === "menu" || mode === "apply") && (
          <div className="flex items-center gap-4 bg-white px-8 py-2 rounded-full border-4 border-[#82ccdd] shadow-xl">
            <span className="text-xl text-gray-400 font-bold uppercase tracking-widest">
              Time Left
            </span>
            <span
              className={`text-4xl font-black ${isUrgent ? "text-red-500 animate-pulse" : "text-[#34495e]"}`}
            >
              {timeLeft}s
            </span>
          </div>
        )}
        {!isBankTile && isMyTurn && (
          <motion.div
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            className="bg-red-500 text-white px-6 py-1 rounded-full text-xl font-bold shadow-lg animate-bounce"
          >
            ⚠️ 현재 일반 칸: 대출 시 수수료 10% 발생!
          </motion.div>
        )}
      </div>

      {/* 메인 패널 */}
      <motion.div
        initial={{ scale: 0.8, y: 100 }}
        animate={{ scale: 1, y: -30 }}
        className="relative w-full max-w-4xl bg-[#fdfdfd] rounded-[60px] border-[12px] border-[#e6f5c5] shadow-[0_40px_80px_rgba(0,0,0,0.6)] flex flex-col items-center p-12"
      >
        {/* 유저 라벨 */}
        <div className="absolute -top-6 left-12 bg-[#5eb347] px-8 py-2 rounded-2xl text-white text-2xl font-bold shadow-lg z-10">
          🏦 {currentPlayerName} 님 이용 중
        </div>

        <div className="absolute top-6 right-12 flex flex-col items-end">
          <div className="bg-[#b19149] px-6 py-2 rounded-full border-4 border-white text-white text-2xl shadow-md">
            {userBell.toLocaleString()} <small>벨</small>
          </div>
          {userLoan > 0 && (
            <span className="text-red-500 font-bold mt-1 text-lg">
              상환액: {userLoan.toLocaleString()}벨
            </span>
          )}
        </div>

        <div className="text-center mt-6 mb-10">
          <h1 className="text-7xl font-bold text-[#5eb347]">너굴 은행</h1>
          {!isMyTurn && (
            <p className="text-2xl text-[#82ccdd] mt-4 font-bold">
              {currentPlayerName} 님이 신중하게 고민 중입니다...
            </p>
          )}
        </div>

        <div className="w-full flex flex-col items-center min-h-[320px] justify-center">
          <AnimatePresence mode="wait">
            {mode === "menu" && (
              <motion.div
                key="menu"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-10"
              >
                <div className="grid grid-cols-2 gap-12">
                  <BankButton
                    onClick={() => setMode("apply")}
                    color="#7ed321"
                    icon="💰"
                    label="대출 신청"
                    disabled={!isMyTurn}
                    subLabel={!isBankTile ? "수수료 10%" : "수수료 없음"}
                  />
                  <BankButton
                    onClick={() => handleConfirm("REPAY")}
                    color="#5eb347"
                    icon="💵"
                    label="빚 갚기"
                    disabled={!isMyTurn || userLoan <= 0}
                    subLabel="즉시 상환"
                  />
                </div>
                <button
                  onClick={onExit}
                  className="text-[#8b5a2b] text-3xl hover:scale-110 transition-transform font-bold relative z-20"
                >
                  지금은 나갈래구리 (EXIT)
                </button>
              </motion.div>
            )}
            {mode === "apply" && (
              <motion.div
                key="apply"
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="flex flex-col items-center gap-8"
              >
                <div className="text-3xl text-gray-500">
                  얼마나 필요하냐구리?
                </div>
                <div className="flex items-center gap-12 bg-[#f9f9f9] p-12 rounded-[50px] border-4 border-[#7ed321] shadow-inner">
                  <motion.button
                    whileTap={{ scale: 0.8 }}
                    onClick={() => setAmount(Math.max(10, amount - 10))}
                    className="text-8xl text-[#7ed321] font-black"
                  >
                    －
                  </motion.button>
                  <div className="flex flex-col items-center min-w-[240px]">
                    <div className="flex items-baseline gap-2">
                      <span className="text-9xl font-black text-[#5a4a42]">
                        {amount}
                      </span>
                      <span className="text-4xl text-[#5a4a42]">벨</span>
                    </div>
                    {!isBankTile && (
                      <span className="text-red-500 text-xl font-bold mt-2">
                        나중에 {amount + amount * 0.1}벨로 갚아야 함!
                      </span>
                    )}
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.8 }}
                    onClick={() => setAmount(Math.min(100, amount + 10))}
                    className="text-8xl text-[#7ed321] font-black"
                  >
                    ＋
                  </motion.button>
                </div>
                <div className="flex gap-6">
                  <button
                    onClick={() => handleConfirm("LOAN")}
                    className="px-16 py-5 bg-[#7ed321] text-white rounded-full text-4xl font-bold shadow-[0_8px_0_#5a9a18] active:translate-y-2 active:shadow-none transition-all"
                  >
                    확인
                  </button>
                  <button
                    onClick={() => setMode("menu")}
                    className="px-16 py-5 bg-gray-400 text-white rounded-full text-4xl font-bold shadow-[0_8px_0_#777] active:translate-y-2 active:shadow-none transition-all"
                  >
                    취소
                  </button>
                </div>
              </motion.div>
            )}
            {(mode === "processing" || mode === "success") && (
              <motion.div
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                className="flex flex-col items-center gap-6"
              >
                <motion.div
                  animate={{ rotate: mode === "processing" ? 360 : 0 }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="text-[120px]"
                >
                  {mode === "processing" ? "🍃" : "✨"}
                </motion.div>
                <p className="text-5xl font-black text-[#5a4a42] text-center leading-tight">
                  {mode === "processing"
                    ? "서버에 서류 보내는 중..."
                    : feedbackMsg}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* 하단 너굴 & 머리 위 말풍선 영역 */}
      <div className="absolute bottom-5 left-10 flex flex-col items-center">
        {/* 1. 말풍선 (너굴 머리 위) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-2 bg-white p-6 rounded-[40px] border-4 border-[#5eb347] shadow-2xl relative max-w-sm z-40"
        >
          <p className="text-2xl font-bold text-[#5a4a42] leading-relaxed text-center">
            {isMyTurn
              ? isBankTile
                ? "은행 칸에 잘 왔다구리!\n여긴 수수료가 없다구리~"
                : "급하게 빌리는 거니\n수수료 10%는 이해하라구리!"
              : `${currentPlayerName} 님이\n대출 상담 중이라구리. 기다려라구리!`}
          </p>
          {/* 말풍선 꼬리 (중앙 아래로) */}
          <div className="absolute bottom-[-18px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[18px] border-l-transparent border-r-[18px] border-r-transparent border-t-[18px] border-t-[#5eb347]" />
        </motion.div>

        {/* 2. 너굴 이미지 */}
        <img
          src="/images/tom-nook.png"
          alt="너굴"
          className="w-80 h-80 object-contain z-30"
        />
      </div>
    </motion.div>
  );
};

const BankButton = ({ onClick, color, icon, label, subLabel, disabled }) => (
  <motion.button
    whileHover={!disabled ? { scale: 1.05, rotate: 1 } : {}}
    whileTap={!disabled ? { scale: 0.95 } : {}}
    onClick={onClick}
    disabled={disabled}
    className={`w-72 h-72 rounded-[60px] flex flex-col items-center justify-center text-white shadow-[0_15px_0_rgba(0,0,0,0.1)] transition-all
            ${
              disabled
                ? "bg-gray-300 grayscale opacity-40 cursor-not-allowed"
                : "cursor-pointer"
            }`}
    style={{ backgroundColor: !disabled ? color : undefined }}
  >
    <span className="text-[100px] mb-2">{icon}</span>
    <span className="text-4xl font-black">{label}</span>
    <span className="text-lg mt-2 opacity-80 bg-black/20 px-4 py-1 rounded-full">
      {subLabel}
    </span>
  </motion.button>
);

export default Loan;
