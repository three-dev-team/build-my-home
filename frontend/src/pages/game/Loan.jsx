import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameTimer } from "../../hooks/useGameTimer.js";

import {
  MAX_LOAN_AMOUNT,
  MIN_LOAN_AMOUNT,
} from "../../constants/gameConstants.js";

/**
 * @param {number} userBell - 현재 유저 잔액
 * @param {number} userLoan - 현재 유저 대출금
 * @param {boolean} isMyTurn - 현재 조작 권한이 있는 유저인지
 * @param {string} currentPlayerName - 현재 은행을 이용 중인 유저의 이름
 * @param {boolean} isBankTile - 현재 위치가 '대출 칸'인지 여부 (false면 수수료 10% 추가)
 * @param {number} timeoutSeconds - 타이머 제한 시간 (초 단위)
 * @param {function} onAction - 서버 전송 함수
 * @param {function} onExit - 칸용 닫기
 * @param {function} onClose - ATM용 닫기
 */

const Loan = ({
  userBell = 0,
  userLoan = 0,
  currentPlayerName = "익명의 주민",
  isMyTurn = false,
  timeoutSeconds,
  onExit,
  onClose,
  isBankTile = true, // 기본값 true (은행), false면 ATM
  // WebSocket Client
  onAction, // WebSocket 직접 사용 대신 핸들러 사용
}) => {
  // 은행용 기본값: 50 (최소 단위)
  const [amount, setAmount] = useState(50);
  const [keypadAmount, setKeypadAmount] = useState("0"); // ATM용 (키패드 입력)
  const [mode, setMode] = useState("menu");
  const [feedbackMsg, setFeedbackMsg] = useState("");

  // 닫기 함수 통합
  const handleExit = () => {
    if (isBankTile) {
      onExit?.(); // 은행: 턴 넘김
    } else {
      onClose?.(); // ATM: WAITING_PLAYER_ACTION으로
    }
  };

  // 타이머 훅 사용 (보여주기용, 실제 타임아웃 액션 처리 X)
  const { timeLeft, isUrgent, hasTimeOutPanel } = useGameTimer(timeoutSeconds);

  // 타임아웃 시 자동 종료
  useEffect(() => {
    if (timeLeft === 0 && timeoutSeconds > 0) {
      handleExit(); // 통합 함수 사용
    }
  }, [timeLeft]);

  // 타임아웃 시 자동 종료 (새로 추가된 로직)
  useEffect(() => {
    if (timeLeft === 0 && onExit) {
      handleExit();
    }
  }, [timeLeft, onExit]);

  if (timeoutSeconds === undefined) {
    console.log("데이터 기다리는 중...");
    // [DEV] 테스트 모드 등에서 시간이 안 넘어오면 null 반환하기보다 일단 0으로 처리하거나 기다림
    // 여기서는 일단 기존 로직 유지하되, 필요하면 렌더링하도록 수정 가능
    return null;
  }

  // if (!hasTimeOutPanel) return null; // [FIX] 타임아웃 0초여도(이미 지났어도) 화면은 뜨게 수정

  // ---------------- ATM 키패드 핸들러 ----------------
  const handleKeypadPress = (num) => {
    let nextValStr;

    if (keypadAmount === "0") {
      nextValStr = String(num);
    } else {
      nextValStr = keypadAmount + String(num);
    }

    // 최대 금액 제한 체크
    // [VALIDATION] 상환 모드일 경우: 빚(userLoan)보다 많이 입력 불가
    if (mode === "atm_input_repay") {
      if (Number(nextValStr) > userLoan) {
        // 남은 빚까지만 입력 가능하도록 자동 조정
        nextValStr = String(userLoan);
      }
    } else {
      // 대출 모드일 경우: 시스템 최대 한도 체크
      if (Number(nextValStr) > MAX_LOAN_AMOUNT) {
        nextValStr = String(MAX_LOAN_AMOUNT);
      }
    }

    // 길이 제한도 유지 (혹시 모를 오버플로우 방지)
    if (nextValStr.length <= 9) {
      setKeypadAmount(nextValStr);
    }
  };

  const handleKeypadBackspace = () => {
    if (keypadAmount.length <= 1) {
      setKeypadAmount("0");
    } else {
      setKeypadAmount(keypadAmount.slice(0, -1));
    }
  };

  const handleKeypadClear = () => {
    setKeypadAmount("0");
  };

  const handleConfirm = (type) => {
    // 은행/ATM 불문하고 내 턴이 아니면 동작 중단
    if (!isMyTurn) return;

    // 대출/상환 금액 결정 (ATM이면 키패드 값, 은행이면 +/- 값)
    const finalAmount = !isBankTile ? Number(keypadAmount) : amount;

    // [VALIDATION] 처리 시작 전에 미리 검증 (UI 멈춤 방지)
    if (type === "REPAY") {
      const repayCheckAmount = !isBankTile ? finalAmount : userLoan;

      if (repayCheckAmount > userBell) {
        alert(`가진 돈(${userBell.toLocaleString()}벨)이 부족하다구리!`);
        return;
      }
      if (repayCheckAmount > userLoan) {
        alert(
          `빚(${userLoan.toLocaleString()}벨)보다 더 많이 갚을 필요는 없다구리!`,
        );
        return;
      }
    } else if (type === "LOAN") {
      if (finalAmount < MIN_LOAN_AMOUNT) {
        alert(`${MIN_LOAN_AMOUNT}벨 부터 거래 가능하다구리!`);
        return;
      }
      if (!isBankTile && finalAmount % 50 !== 0) {
        alert("50벨 단위로만 거래 가능하다구리!");
        return;
      }
    }

    setMode("processing");
    setTimeout(() => {
      if (type === "LOAN") {
        // 대출 요청
        onAction("LOAN_BORROW", {
          amount: finalAmount,
          isBankTile: isBankTile,
        });
        const feeMsg = !isBankTile ? " (수수료 10% 포함)" : "";
        setFeedbackMsg(`${finalAmount}벨 대출 완료!${feeMsg}`);
      } else {
        // 상환 요청
        const repayAmount = !isBankTile ? finalAmount : userLoan;
        onAction("LOAN_REPAY", {
          amount: repayAmount,
          isBankTile: isBankTile,
        });
        setFeedbackMsg(`${repayAmount}벨 상환 완료!`);
      }
      setMode("success");
      setTimeout(handleExit, 2500);
    }, 1500);
  };

  // ---------------- UI 렌더링 ----------------
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 w-screen h-screen bg-[#2c3e50]/90 backdrop-blur-md flex items-center justify-center font-gaegu z-[100] overflow-hidden"
    >
      <div className="absolute top-8 w-full flex flex-col items-center gap-3">
        {/* -------- 타이머 -------- */}
        {(mode === "menu" || mode === "apply" || mode.startsWith("atm_")) && (
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
      </div>

      {/* 메인 패널 */}
      <motion.div
        initial={{ scale: 0.8, y: 100 }}
        animate={{ scale: 1, y: -30 }}
        className="relative w-full max-w-4xl bg-[#fdfdfd] rounded-[60px] border-[12px] border-[#e6f5c5] shadow-[0_40px_80px_rgba(0,0,0,0.6)] flex flex-col items-center p-12"
      >
        {/* 유저 라벨 */}
        <div className="absolute -top-6 left-12 bg-[#5eb347] px-8 py-2 rounded-2xl text-white text-2xl font-bold shadow-lg z-10">
          {isBankTile ? "🏦 은행 창구" : "🏧 ATM 기기"} - {currentPlayerName} 님
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
          <h1 className="text-7xl font-bold text-[#5eb347]">
            {isBankTile ? "너굴 은행" : "너굴 ATM"}
          </h1>
          {!isMyTurn && (
            <p className="text-2xl text-[#82ccdd] mt-4 font-bold">
              {currentPlayerName} 님이 신중하게 고민 중입니다...
            </p>
          )}
        </div>

        <div className="w-full flex flex-col items-center min-h-[320px] justify-center">
          <AnimatePresence mode="wait">
            {/* 1. 메인 메뉴 (은행/ATM 공통 구조 사용) */}
            {mode === "menu" && (
              <motion.div
                key="menu"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-10"
              >
                {/* 은행 모드 메뉴 */}
                {isBankTile ? (
                  <div className="grid grid-cols-2 gap-12">
                    <BankButton
                      onClick={() => setMode("apply")}
                      color="#7ed321"
                      icon="💰"
                      label="대출 신청"
                      disabled={!isMyTurn}
                      subLabel="수수료 없음"
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
                ) : (
                  // ATM 모드 메뉴
                  <div className="grid grid-cols-2 gap-12">
                    <BankButton
                      onClick={() => setMode("atm_input_loan")}
                      color="#7ed321"
                      icon="💳" // 아이콘 변경
                      label="ATM 대출"
                      disabled={!isMyTurn} // 내 턴일 때만 가능
                      subLabel="수수료 10%"
                    />
                    <BankButton
                      onClick={() => setMode("atm_input_repay")}
                      color="#5eb347"
                      icon="💸"
                      label="ATM 상환"
                      disabled={!isMyTurn || userLoan <= 0} // 내 턴이면서 빚이 있어야 가능
                      subLabel="금액 직접 입력"
                    />
                  </div>
                )}

                <button
                  onClick={handleExit}
                  className="text-[#8b5a2b] text-3xl hover:scale-110 transition-transform font-bold relative z-20"
                >
                  지금은 나갈래구리 (EXIT)
                </button>
              </motion.div>
            )}

            {/* 2. 은행 전용 대출 화면 (+/-) */}
            {mode === "apply" && isBankTile && (
              <motion.div
                key="apply"
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -50, opacity: 0 }}
                className="flex flex-col items-center gap-8"
              >
                <div className="text-3xl text-gray-500">
                  얼마나 필요하냐구리?
                </div>
                <div className="flex items-center gap-12 bg-[#f9f9f9] p-12 rounded-[50px] border-4 border-[#7ed321] shadow-inner">
                  <motion.button
                    whileTap={{ scale: 0.8 }}
                    onClick={() => setAmount(Math.max(50, amount - 50))}
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
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.8 }}
                    onClick={() => setAmount(Math.min(500, amount + 50))}
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

            {/* 3. ATM 전용 키패드 화면 */}
            {(mode === "atm_input_loan" || mode === "atm_input_repay") &&
              !isBankTile && (
                <motion.div
                  key="atm-input"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex flex-col items-center w-full"
                >
                  {/* 상단: 입력된 금액 표시 */}
                  <div className="flex flex-col items-center mb-8 w-full">
                    <h3 className="text-3xl text-[#5a4a42] font-bold mb-4">
                      {mode === "atm_input_loan"
                        ? "빌릴 금액을 입력하라구리"
                        : "갚을 금액을 입력하라구리"}
                    </h3>
                    <div className="bg-[#f9f9f9] w-3/4 py-4 px-8 rounded-[30px] border-4 border-[#7ed321] flex justify-end items-center shadow-inner mb-2">
                      <span className="text-6xl text-[#5a4a42] font-black tracking-widest">
                        {Number(keypadAmount).toLocaleString()}
                      </span>
                      <span className="text-3xl text-[#5a4a42] ml-3 font-bold">
                        벨
                      </span>
                    </div>

                    {/* 수수료 및 정보 표시 (너굴 스타일) */}
                    <div className="h-8">
                      {mode === "atm_input_loan" &&
                        Number(keypadAmount) > 0 && (
                          <p className="text-red-500 font-bold text-xl animate-bounce">
                            ⚠️ 수수료{" "}
                            {Math.floor(
                              Number(keypadAmount) * 0.1,
                            ).toLocaleString()}
                            벨 발생! (총 빚:{" "}
                            {(Number(keypadAmount) * 1.1).toLocaleString()}벨)
                          </p>
                        )}
                      {mode === "atm_input_repay" && (
                        <p className="text-[#82ccdd] font-bold text-xl">
                          현재 빚: {userLoan.toLocaleString()}벨
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 하단: 키패드 & 버튼 (너굴 스타일) */}
                  <div className="flex gap-6 w-full px-8 h-64">
                    {/* 키패드 그리드 */}
                    <div className="grid grid-cols-3 gap-3 flex-1">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                        <button
                          key={n}
                          onClick={() => handleKeypadPress(n)}
                          className="bg-white text-[#5a4a42] text-3xl font-black rounded-2xl shadow-[0_4px_0_#ddd] hover:bg-[#f1f1f1] active:translate-y-1 active:shadow-none transition-all border-2 border-[#eee]"
                        >
                          {n}
                        </button>
                      ))}
                      <button
                        onClick={handleKeypadClear}
                        className="bg-[#ffadad] text-white text-3xl font-black rounded-2xl shadow-[0_4px_0_#ff6b6b] hover:bg-[#ff8e8e] active:translate-y-1 active:shadow-none"
                      >
                        C
                      </button>
                      <button
                        onClick={() => handleKeypadPress(0)}
                        className="bg-white text-[#5a4a42] text-3xl font-black rounded-2xl shadow-[0_4px_0_#ddd] hover:bg-[#f1f1f1] active:translate-y-1 active:shadow-none border-2 border-[#eee]"
                      >
                        0
                      </button>
                      <button
                        onClick={handleKeypadBackspace}
                        className="bg-[#ffeaa7] text-[#d35400] text-3xl font-black rounded-2xl shadow-[0_4px_0_#fdcb6e] hover:bg-[#ffe082] active:translate-y-1 active:shadow-none"
                      >
                        ←
                      </button>
                    </div>

                    {/* 확인/취소 버튼 */}
                    <div className="flex flex-col gap-4 w-1/4">
                      <button
                        onClick={() =>
                          handleConfirm(
                            mode === "atm_input_loan" ? "LOAN" : "REPAY",
                          )
                        }
                        className="flex-1 bg-[#7ed321] text-white text-3xl font-black rounded-3xl shadow-[0_6px_0_#5a9a18] hover:brightness-105 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center"
                      >
                        확인
                      </button>
                      <button
                        onClick={() => {
                          setMode("menu");
                          setKeypadAmount("0");
                        }}
                        className="h-20 bg-[#95a5a6] text-white text-2xl font-black rounded-3xl shadow-[0_6px_0_#7f8c8d] hover:bg-[#7f8c8d] active:translate-y-1 active:shadow-none flex items-center justify-center"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

            {/* 4. 처리 중 / 완료 공통 화면 */}
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
      <motion.div
        animate={{ opacity: [0, 1, 1, 0], y: [20, 0, 0, 20] }}
        transition={{ duration: 3, times: [0, 0.3, 0.35, 1] }}
        className="absolute bottom-5 left-10 flex flex-col items-center pointer-events-none"
      >
        {/* 1. 말풍선 (너굴 머리 위) */}
        <div className="mb-2 bg-white p-6 rounded-[40px] border-4 border-[#5eb347] shadow-2xl relative max-w-sm z-40">
          <p className="text-2xl font-bold text-[#5a4a42] leading-relaxed text-center">
            {!isMyTurn
              ? `${currentPlayerName} 님이\n용무를 보고 있다구리.`
              : isBankTile
                ? "은행 창구는 수수료 무료!\n맘껏 빌려라구리!"
                : "ATM은 편리한 만큼\n수수료 10%가 든다구리!"}
          </p>
          {/* 말풍선 꼬리 (중앙 아래로) */}
          <div className="absolute bottom-[-18px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[18px] border-l-transparent border-r-[18px] border-r-transparent border-t-[18px] border-t-[#5eb347]" />
        </div>

        {/* 너굴 이미지 (기존 유지) */}
        <img
          src="/images/tom-nook.png"
          alt="너굴"
          className="w-80 h-80 object-contain z-30"
        />
      </motion.div>
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
