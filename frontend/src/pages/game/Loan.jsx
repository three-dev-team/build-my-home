import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import Subtitle from '../../components/common/Subtitle.jsx';
import { useGameTimer } from '../../hooks/useGameTimer.js';
import { MAX_LOAN_AMOUNT, MIN_LOAN_AMOUNT } from '../../constants/gameConstants.js';
import { CHARACTERS } from '../../constants/characters.js';
import { COLORS, withAlpha } from '../../constants/colors.js';

const ATM_BG_URL = '/images/board/bg-atm.webp';

const clampNumber = (v, min, max) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
};

const safeName = (v, fallback = '익명의 주민') => {
  const s = String(v ?? '').trim();
  if (!s) return fallback;
  if (s.includes('${')) return fallback;
  return s;
};

// 캐릭터 찾기 (id 기반)
const findCharacter = (characterId) => {
  const id = Number(characterId);
  if (!Number.isFinite(id)) return null;
  return (CHARACTERS || []).find((c) => Number(c?.id) === id) || null;
};

/**
 * @param {number} userBell - 현재 유저 잔액
 * @param {number} userLoan - 현재 유저 대출금
 * @param {boolean} isMyTurn - 현재 조작 권한이 있는 유저인지
 * @param {string} currentPlayerName - 현재 은행/ATM을 이용 중인 유저의 이름
 * @param {number} currentPlayerCharacterId - 현재 이용 중인 유저의 캐릭터 id (CHARACTERS.id)
 * @param {boolean} isBankTile - 현재 위치가 '대출 칸(보드)'인지 여부 (false면 ATM)
 * @param {number} timeoutSeconds - 타이머 제한 시간(초)
 * @param {function} onAction - 서버 전송 함수
 * @param {function} onExit - (보드 loan칸) 닫기/시간 종료 시 다음 차례로
 * @param {function} onClose - (ATM) 닫기/시간 종료 시 원래 화면으로(보드/하우스는 바깥에서 처리)
 */
export default function Loan({
                               userBell = 0,
                               userLoan = 0,

                               currentPlayerName = '익명의 주민',
                               currentPlayerCharacterId = null,

                               isMyTurn = false,
                               timeoutSeconds,

                               isBankTile = true,
                               onAction,
                               onExit,
                               onClose,
                             }) {
  // ✅ timeoutSeconds undefined면 데이터 로딩 전 → 렌더 생략 (hook 규칙 OK: 모든 hook보다 먼저 return)
  if (timeoutSeconds === undefined) return null;

  const playerName = useMemo(() => safeName(currentPlayerName), [currentPlayerName]);
  const character = useMemo(() => findCharacter(currentPlayerCharacterId), [currentPlayerCharacterId]);

  const { timeLeft, isUrgent } = useGameTimer(timeoutSeconds);

  // ✅ Hook들은 분기(return)보다 항상 먼저 선언되어야 함
  const [mode, setMode] = useState('MENU');
  const [amount, setAmount] = useState(50); // 보드 loan칸(+/-)용
  const [keypadAmount, setKeypadAmount] = useState('0'); // ATM 키패드용
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const isATM = !isBankTile;

  const finalAmount = useMemo(() => {
    if (isATM) return clampNumber(keypadAmount, 0, MAX_LOAN_AMOUNT);
    return clampNumber(amount, 50, MAX_LOAN_AMOUNT);
  }, [isATM, keypadAmount, amount]);

  // ---------------- 닫기(복귀) 규칙 ----------------
  const handleExit = () => {
    // 3) 보드 loan칸: 다음 차례로
    if (isBankTile) {
      onExit?.();
      return;
    }
    // 1) 액션패널 ATM / 2) 하우스 ATM: 원래 화면으로 (바깥에서 onClose가 처리)
    onClose?.();
  };

  // 타임아웃 시 자동 종료
  useEffect(() => {
    if (timeoutSeconds > 0 && timeLeft === 0) {
      handleExit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  const keypadSet = (nextStr) => {
    const s = String(nextStr ?? '0').replace(/[^\d]/g, '') || '0';
    if (s.length > 9) return;
    setKeypadAmount(s);
  };

  const handleKeypadPress = (num) => {
    const n = String(num);
    const next = keypadAmount === '0' ? n : keypadAmount + n;

    // 상환 모드일 때는 최대 userLoan로 제한
    if (mode === 'INPUT_REPAY') {
      keypadSet(String(Math.min(Number(next), Number(userLoan || 0))));
      return;
    }

    // 대출 모드일 때는 MAX_LOAN_AMOUNT로 제한
    keypadSet(String(Math.min(Number(next), MAX_LOAN_AMOUNT)));
  };

  const handleKeypadBackspace = () => {
    if (keypadAmount.length <= 1) keypadSet('0');
    else keypadSet(keypadAmount.slice(0, -1));
  };

  const handleKeypadClear = () => keypadSet('0');

  const validateAmount = (type, v) => {
    const val = Number(v);

    if (type === 'REPAY') {
      if (val <= 0) return '상환할 금액을 입력해줘.';
      if (val > userBell) return `가진 돈(${Number(userBell).toLocaleString()}벨)이 부족해.`;
      if (val > userLoan) return `빚(${Number(userLoan).toLocaleString()}벨)보다 더 많이 갚을 필요는 없어.`;
      return '';
    }

    // LOAN
    if (val < MIN_LOAN_AMOUNT) return `${MIN_LOAN_AMOUNT}벨 부터 거래 가능해.`;
    // ATM은 50벨 단위 제한
    if (isATM && val % 50 !== 0) return '50벨 단위로만 거래 가능해.';
    return '';
  };

  const handleConfirm = (type) => {
    if (!isMyTurn) return;

    const val = finalAmount;
    const err = validateAmount(type, val);
    if (err) {
      alert(err);
      return;
    }

    setMode('PROCESSING');

    setTimeout(() => {
      if (type === 'LOAN') {
        onAction?.('LOAN_BORROW', { amount: val, isBankTile });
        setFeedbackMsg(`${Number(val).toLocaleString()}벨 대출 완료!`);
      } else {
        onAction?.('LOAN_REPAY', { amount: val, isBankTile });
        setFeedbackMsg(`${Number(val).toLocaleString()}벨 상환 완료!`);
      }

      setMode('DONE');
      setTimeout(handleExit, 1200);
    }, 900);
  };

  // ---------------- 공통 배경/레이아웃 ----------------
  const rootClass = 'fixed inset-0 w-screen h-screen z-[30000] overflow-hidden select-none';

  const topTimer = (
    <div className="absolute top-6 right-6 z-20">
      <div
        className="flex items-center gap-3 px-5 py-2 rounded-full"
        style={{
          backgroundColor: withAlpha(COLORS.ac.black, 0.55),
          border: `2px solid ${withAlpha(COLORS.ac.white, 0.35)}`,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-gosanja)',
            fontSize: 18,
            color: withAlpha(COLORS.ac.white, 0.8),
          }}
        >
          TIME
        </span>
        <span
          style={{
            fontFamily: 'var(--font-gosanja)',
            fontSize: 22,
            color: isUrgent ? COLORS.ac.red : COLORS.ac.white,
          }}
        >
          {timeLeft}s
        </span>
      </div>
    </div>
  );

  // ---------------- 캐릭터(ATM 이미지) ----------------
  const characterNode = (
    <div className="absolute inset-0 z-10 pointer-events-none">
      {character?.atmImage ? (
        <img
          src={character.atmImage}
          alt="character"
          style={{
            position: 'absolute',
            left: '58%',
            bottom: '10%',
            width: '26%',
            height: 'auto',
            objectFit: 'contain',
          }}
          draggable={false}
        />
      ) : null}
    </div>
  );

  // ---------------- 관전자 화면 ----------------
  // ✅ 이제 hook들이 모두 선언된 뒤 return 분기 → hook 규칙 위반 없음
  if (!isMyTurn) {
    return (
      <div className={rootClass}>
        {/* 배경 */}
        <img
          src={ATM_BG_URL}
          alt="atm-bg"
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />

        {topTimer}
        {characterNode}

        {/* 관전자 Subtitle */}
        <div className="absolute inset-0 z-30 pointer-events-none">
          <Subtitle
            contentText={`${playerName} 님이 ATM을 이용중입니다\n보안 상의 이유로 잠시만 대기해주세요`}
            highlights={[{ text: playerName, color: character?.color || COLORS.ac.nookCyan }]}
            showTriangle={false}
            typingSpeed={20}
          />
        </div>
      </div>
    );
  }

  // ---------------- UI(내 턴) ----------------
  const inputSubtitle = (
    <Subtitle
      contentText={mode === 'INPUT_LOAN' ? '빌릴 금액을 입력해주세요.' : '갚을 금액을 입력해주세요.'}
      showTriangle={false}
      typingSpeed={18}
    />
  );

  const processingSubtitle = (
    <Subtitle contentText={mode === 'PROCESSING' ? '처리 중입니다...' : feedbackMsg} showTriangle={false} typingSpeed={18} />
  );

  // 입력 패널(ATM/보드 공용) - Loan.jsx에서 별도 CSS 추가 없이 tailwind로만 구성
  const inputPanel = (
    <div className="absolute inset-0 z-25 flex items-center justify-center pointer-events-none">
      <div
        className="pointer-events-auto rounded-[36px] px-10 py-8"
        style={{
          width: 'min(920px, 92vw)',
          backgroundColor: withAlpha(COLORS.ac.black, 0.55),
          border: `2px solid ${withAlpha(COLORS.ac.white, 0.28)}`,
          backdropFilter: 'blur(10px)',
        }}
      >
        {/* 금액 표시 */}
        <div className="flex items-end justify-between mb-6">
          <div
            style={{
              fontFamily: 'var(--font-gosanja)',
              fontSize: 22,
              color: withAlpha(COLORS.ac.white, 0.9),
            }}
          >
            {mode === 'INPUT_LOAN' ? '대출' : '상환'}
          </div>

          <div className="flex items-baseline gap-2">
            <div
              style={{
                fontFamily: 'var(--font-gosanja)',
                fontSize: 44,
                color: COLORS.ac.white,
              }}
            >
              {Number(finalAmount).toLocaleString()}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-gosanja)',
                fontSize: 22,
                color: withAlpha(COLORS.ac.white, 0.85),
              }}
            >
              벨
            </div>
          </div>
        </div>

        {/* 안내(ATM 수수료, 상환 가능 등) */}
        <div
          className="mb-6"
          style={{
            fontFamily: 'var(--font-gosanja)',
            fontSize: 18,
            color: withAlpha(COLORS.ac.white, 0.85),
            lineHeight: 1.35,
          }}
        >
          {mode === 'INPUT_LOAN' && isATM ? (
            <>
              ATM은 편리한 만큼 수수료 10%가 붙어.
              <br />
              (참고) 수수료: {Math.floor(Number(finalAmount) * 0.1).toLocaleString()}벨
            </>
          ) : null}

          {mode === 'INPUT_REPAY' ? (
            <>
              현재 빚: {Number(userLoan).toLocaleString()}벨 / 보유: {Number(userBell).toLocaleString()}벨
            </>
          ) : null}

          {!isATM && mode === 'INPUT_LOAN' ? <>은행 창구는 수수료가 없어.</> : null}
        </div>

        {/* 입력 방식 */}
        {isATM ? (
          <div className="flex gap-6">
            {/* 키패드 */}
            <div className="grid grid-cols-3 gap-3 flex-1">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => handleKeypadPress(n)}
                  className="rounded-2xl py-4"
                  style={{
                    backgroundColor: withAlpha(COLORS.ac.white, 0.92),
                    color: COLORS.ac.darkBrown,
                    fontFamily: 'var(--font-gosanja)',
                    fontSize: 22,
                    border: `1px solid ${withAlpha(COLORS.ac.black, 0.15)}`,
                  }}
                >
                  {n}
                </button>
              ))}

              <button
                type="button"
                onClick={handleKeypadClear}
                className="rounded-2xl py-4"
                style={{
                  backgroundColor: withAlpha(COLORS.ac.red, 0.9),
                  color: COLORS.ac.white,
                  fontFamily: 'var(--font-gosanja)',
                  fontSize: 20,
                }}
              >
                C
              </button>

              <button
                type="button"
                onClick={() => handleKeypadPress(0)}
                className="rounded-2xl py-4"
                style={{
                  backgroundColor: withAlpha(COLORS.ac.white, 0.92),
                  color: COLORS.ac.darkBrown,
                  fontFamily: 'var(--font-gosanja)',
                  fontSize: 22,
                  border: `1px solid ${withAlpha(COLORS.ac.black, 0.15)}`,
                }}
              >
                0
              </button>

              <button
                type="button"
                onClick={handleKeypadBackspace}
                className="rounded-2xl py-4"
                style={{
                  backgroundColor: withAlpha(COLORS.ac.yellow, 0.9),
                  color: COLORS.ac.darkBrown,
                  fontFamily: 'var(--font-gosanja)',
                  fontSize: 20,
                }}
              >
                ←
              </button>
            </div>

            {/* 버튼 */}
            <div className="flex flex-col gap-3 w-[220px]">
              <button
                type="button"
                onClick={() => handleConfirm(mode === 'INPUT_LOAN' ? 'LOAN' : 'REPAY')}
                className="rounded-2xl py-5"
                style={{
                  backgroundColor: COLORS.ac.nookCyan,
                  color: COLORS.ac.white,
                  fontFamily: 'var(--font-gosanja)',
                  fontSize: 22,
                }}
              >
                확인
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('MENU');
                  setKeypadAmount('0');
                }}
                className="rounded-2xl py-5"
                style={{
                  backgroundColor: withAlpha(COLORS.ac.white, 0.25),
                  color: COLORS.ac.white,
                  fontFamily: 'var(--font-gosanja)',
                  fontSize: 20,
                  border: `1px solid ${withAlpha(COLORS.ac.white, 0.25)}`,
                }}
              >
                뒤로
              </button>

              <button
                type="button"
                onClick={handleExit}
                className="rounded-2xl py-5"
                style={{
                  backgroundColor: withAlpha(COLORS.ac.white, 0.15),
                  color: withAlpha(COLORS.ac.white, 0.95),
                  fontFamily: 'var(--font-gosanja)',
                  fontSize: 18,
                  border: `1px solid ${withAlpha(COLORS.ac.white, 0.2)}`,
                }}
              >
                나가기
              </button>
            </div>
          </div>
        ) : (
          // 보드 loan칸: +/- 입력
          <div className="flex items-center justify-between gap-6">
            <button
              type="button"
              onClick={() => setAmount((prev) => Math.max(50, Number(prev) - 50))}
              className="w-[120px] rounded-2xl py-5"
              style={{
                backgroundColor: withAlpha(COLORS.ac.white, 0.92),
                color: COLORS.ac.darkBrown,
                fontFamily: 'var(--font-gosanja)',
                fontSize: 34,
              }}
            >
              －
            </button>

            <div className="flex-1" />

            <button
              type="button"
              onClick={() => setAmount((prev) => Math.min(MAX_LOAN_AMOUNT, Number(prev) + 50))}
              className="w-[120px] rounded-2xl py-5"
              style={{
                backgroundColor: withAlpha(COLORS.ac.white, 0.92),
                color: COLORS.ac.darkBrown,
                fontFamily: 'var(--font-gosanja)',
                fontSize: 34,
              }}
            >
              ＋
            </button>

            <div className="w-[16px]" />

            <button
              type="button"
              onClick={() => handleConfirm(mode === 'INPUT_LOAN' ? 'LOAN' : 'REPAY')}
              className="w-[180px] rounded-2xl py-5"
              style={{
                backgroundColor: COLORS.ac.nookCyan,
                color: COLORS.ac.white,
                fontFamily: 'var(--font-gosanja)',
                fontSize: 22,
              }}
            >
              확인
            </button>

            <button
              type="button"
              onClick={() => setMode('MENU')}
              className="w-[180px] rounded-2xl py-5"
              style={{
                backgroundColor: withAlpha(COLORS.ac.white, 0.25),
                color: COLORS.ac.white,
                fontFamily: 'var(--font-gosanja)',
                fontSize: 20,
                border: `1px solid ${withAlpha(COLORS.ac.white, 0.25)}`,
              }}
            >
              뒤로
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className={rootClass}>
      {/* 배경 */}
      <img src={ATM_BG_URL} alt="atm-bg" className="absolute inset-0 w-full h-full object-cover" draggable={false} />

      {topTimer}
      {characterNode}

      {/* 상태별 UI */}
      <AnimatePresence mode="wait">
        {mode === 'MENU' && (
          <motion.div
            key="menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30"
          >
            <menu className="absolute inset-0 pointer-events-none m-0 p-0">
              {/* Subtitle (옵션 포함) */}
              <div className="absolute inset-0 pointer-events-none">
                <Subtitle
                  contentText="어떤 서비스를 이용하시겠습니까?"
                  options={[
                    {
                      text: '대출',
                      onClick: () => {
                        if (!isMyTurn) return;
                        setMode('INPUT_LOAN');
                        if (isATM) setKeypadAmount('0');
                      },
                    },
                    {
                      text: '대출금 상환',
                      onClick: () => {
                        if (!isMyTurn) return;
                        setMode('INPUT_REPAY');
                        if (isATM) setKeypadAmount('0');
                      },
                    },
                  ]}
                  optionDisabled={!isMyTurn}
                  showTriangle={false}
                  typingSpeed={18}
                />
              </div>

              {/* 나가기(빠른 종료) */}
              <div className="absolute top-6 left-6 pointer-events-auto z-40">
                <button
                  type="button"
                  onClick={handleExit}
                  className="px-5 py-3 rounded-full"
                  style={{
                    backgroundColor: withAlpha(COLORS.ac.black, 0.55),
                    border: `1px solid ${withAlpha(COLORS.ac.white, 0.25)}`,
                    color: COLORS.ac.white,
                    fontFamily: 'var(--font-gosanja)',
                    fontSize: 16,
                  }}
                >
                  나가기
                </button>
              </div>
            </menu>
          </motion.div>
        )}

        {(mode === 'INPUT_LOAN' || mode === 'INPUT_REPAY') && (
          <motion.div
            key="input"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30"
          >
            {inputPanel}
            <div className="absolute inset-0 pointer-events-none">{inputSubtitle}</div>
          </motion.div>
        )}

        {(mode === 'PROCESSING' || mode === 'DONE') && (
          <motion.div
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30"
          >
            {/* 가운데 처리 아이콘 */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                animate={{ rotate: mode === 'PROCESSING' ? 360 : 0, scale: [1, 1.05, 1] }}
                transition={{ repeat: mode === 'PROCESSING' ? Infinity : 0, duration: 0.9 }}
                style={{
                  width: 140,
                  height: 140,
                  borderRadius: 999,
                  backgroundColor: withAlpha(COLORS.ac.black, 0.55),
                  border: `2px solid ${withAlpha(COLORS.ac.white, 0.25)}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: COLORS.ac.white,
                  fontFamily: 'var(--font-gosanja)',
                  fontSize: 32,
                }}
              >
                {mode === 'PROCESSING' ? '...' : '✓'}
              </motion.div>
            </div>

            <div className="absolute inset-0 pointer-events-none">{processingSubtitle}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
