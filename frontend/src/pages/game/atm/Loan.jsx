// Loan.jsx (풀코드) ✅ AspectLayout 중첩 제거(상위 GamePage의 16:9 컨테이너 기준) + absolute inset-0 오버레이
import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import DialogBox from '../../../components/common/DialogBox.jsx';
import ExitButton from '../../../components/common/ExitButton.jsx';
import AtmCalculator from './AtmCalculator.jsx';

import { useGameTimer } from '../../../hooks/useGameTimer.js';
import { MAX_LOAN_AMOUNT, MIN_LOAN_AMOUNT } from '../../../constants/gameConstants.js';
import { CHARACTERS } from '../../../constants/characters.js';
import { COLORS, withAlpha } from '../../../constants/colors.js';

const BG_ENTRY = '/images/board/bg-atm.webp';
const BG_CALC = '/images/board/bg-atm-calculator.webp';

const safeName = (v, fallback = '익명의 주민') => {
  const s = String(v ?? '').trim();
  if (!s) return fallback;
  if (s.includes('${')) return fallback;
  return s;
};

const clampNumber = (v, min, max) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
};

const findCharacter = (characterId) => {
  const id = Number(characterId);
  if (!Number.isFinite(id)) return null;
  return (CHARACTERS || []).find((c) => Number(c?.id) === id) || null;
};

// ✅ 혹시 캐릭터 id를 저장해두는 구조면 이걸로 fallback (없으면 그냥 null)
const getFallbackCharacterId = () => {
  const keys = ['characterId', 'selectedCharacterId', 'currentCharacterId'];
  for (const k of keys) {
    const v = sessionStorage.getItem(k);
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
};

export default function Loan({
                               userBell = 0,
                               userLoan = 0,

                               currentPlayerName = '익명의 주민',
                               currentPlayerCharacterId = null,

                               isMyTurn = false,
                               timeoutSeconds,

                               isBankTile = false,

                               onAction,
                               onExit,
                               onClose,
                             }) {
  if (timeoutSeconds === undefined) return null;

  const playerName = useMemo(() => safeName(currentPlayerName), [currentPlayerName]);

  // ✅ 여기서부터가 핵심: id가 null이면 fallback 시도
  const resolvedCharacterId = useMemo(() => {
    if (currentPlayerCharacterId !== null && currentPlayerCharacterId !== undefined) return currentPlayerCharacterId;
    return getFallbackCharacterId();
  }, [currentPlayerCharacterId]);

  const character = useMemo(() => findCharacter(resolvedCharacterId), [resolvedCharacterId]);

  const { timeLeft, isUrgent } = useGameTimer(timeoutSeconds);

  const [mode, setMode] = useState('MENU');
  const [calcValue, setCalcValue] = useState(1);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const handleExit = () => {
    if (isBankTile) {
      onExit?.();
      return;
    }
    onClose?.();
  };

  useEffect(() => {
    if (timeoutSeconds > 0 && timeLeft === 0) {
      handleExit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  // ✅ 중요: 상위(GamePage)의 AspectLayout(16:9 컨테이너) 안에서만 덮는 오버레이
  const rootClass = 'absolute inset-0 z-[30000] overflow-hidden select-none';

  const topTimer = (
    <div className="absolute top-6 right-6 z-20">
      <div
        className="flex items-center gap-3 px-5 py-2 rounded-full"
        style={{
          backgroundColor: withAlpha(COLORS.ac.black, 0.55),
          border: `2px solid ${withAlpha(COLORS.ac.white, 0.35)}`,
        }}
      >
        <span style={{ fontFamily: 'var(--font-gosanja)', fontSize: 18, color: withAlpha(COLORS.ac.white, 0.8) }}>
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

  // ---------------- 계산기용 숫자 ----------------
  const loanRemain = useMemo(() => Math.max(0, Number(MAX_LOAN_AMOUNT) - Number(userLoan || 0)), [userLoan]);
  const loanMax = useMemo(() => clampNumber(loanRemain, 0, MAX_LOAN_AMOUNT), [loanRemain]);
  const repayMax = useMemo(
    () => Math.max(0, Math.min(Number(userLoan || 0), Number(userBell || 0))),
    [userLoan, userBell],
  );

  const helperTextLoan = useMemo(() => {
    const fee = Math.floor(Number(calcValue || 0) * 0.1);
    if (!Number.isFinite(fee) || fee <= 0) return '';
    const totalDebt = Number(userLoan || 0) + Number(calcValue || 0) + fee;
    return `수수료 ${fee.toLocaleString()}벨 발생 (총 빚: ${totalDebt.toLocaleString()}벨)`;
  }, [calcValue, userLoan]);

  const helperTextRepay = useMemo(() => {
    const left = Math.max(0, Number(userLoan || 0) - Number(calcValue || 0));
    return `상환 후 남은 빚: ${left.toLocaleString()}벨`;
  }, [calcValue, userLoan]);

  const validate = (type, amount) => {
    const val = Number(amount);

    if (type === 'LOAN') {
      if (val < MIN_LOAN_AMOUNT) return `${MIN_LOAN_AMOUNT}벨 부터 거래 가능해.`;
      if (val > loanMax) return '대출 잔액을 초과했어.';
      if (val % 50 !== 0) return '50벨 단위로만 거래 가능해.';
      return '';
    }

    if (val <= 0) return '상환할 금액을 입력해줘.';
    if (val > repayMax) return '상환 가능한 금액을 초과했어.';
    if (val % 50 !== 0) return '50벨 단위로만 거래 가능해.';
    return '';
  };

  const doConfirm = (type) => {
    if (!isMyTurn) return;

    const err = validate(type, calcValue);
    if (err) {
      alert(err);
      return;
    }

    setMode('PROCESSING');

    setTimeout(() => {
      if (type === 'LOAN') {
        onAction?.('LOAN_BORROW', { amount: calcValue, isBankTile });
        setFeedbackMsg(`${Number(calcValue).toLocaleString()}벨 대출 완료!`);
      } else {
        onAction?.('LOAN_REPAY', { amount: calcValue, isBankTile });
        setFeedbackMsg(`${Number(calcValue).toLocaleString()}벨 상환 완료!`);
      }

      setMode('DONE');
      setTimeout(handleExit, 1200);
    }, 900);
  };

  // ---------------- Entry 씬(배경 + 캐릭터) ----------------
  // ✅ 상위 컨테이너(AspectLayout 내부)가 containerType:size를 이미 갖고 있어도,
  //    여기서 var(--s) 계산을 로컬로 유지하면 안전하게 쓸 수 있음.
  const sceneScaleStyle = {
    position: 'absolute',
    inset: 0,
    zIndex: 0,
    overflow: 'hidden',
    containerType: 'size',
    '--sx': 'calc(100cqw / 1920)',
    '--sy': 'calc(100cqh / 1080)',
    '--s': 'min(var(--sx), var(--sy))',
  };

  const rightCharacterBox = character?.rightImage ? (
    <div
      style={{
        position: 'absolute',
        right: 'calc(884 * var(--s))',
        bottom: 'calc(416 * var(--s))',
        width: 'calc(200 * var(--s))',
        height: 'calc(460 * var(--s))',
        zIndex: 10,
        pointerEvents: 'none',
      }}
    >
      <img
        src={character.rightImage}
        alt="right-character"
        draggable={false}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          objectFit: 'contain',
          objectPosition: 'center bottom',
        }}
      />
    </div>
  ) : null;

  const entryScene = (
    <div style={sceneScaleStyle}>
      <img src={BG_ENTRY} alt="atm-entry-bg" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
      {rightCharacterBox}
    </div>
  );

  const exitNode = <ExitButton onClick={handleExit} disabled={false} />;

  // ---------------- 관전자 ----------------
  if (!isMyTurn) {
    return (
      <div className={rootClass}>
        {entryScene}
        {topTimer}

        <DialogBox
          open
          text={`${playerName} 님이 ATM을 이용중입니다\n보안 상의 이유로 잠시만 대기해주세요`}
          textColor={COLORS.ac.creamWhite}
          options={[]}
          optionDisabled
        />

        {exitNode}
      </div>
    );
  }

  // ---------------- 내 턴 ----------------
  const isCalc = mode === 'CALC_LOAN' || mode === 'CALC_REPAY';

  return (
    <div className={rootClass}>
      {/* MENU/처리/완료는 엔트리 배경 + 캐릭터 */}
      {!isCalc && entryScene}

      {/* 계산기는 계산기 배경 */}
      {isCalc && (
        <img src={BG_CALC} alt="atm-calc-bg" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
      )}

      {topTimer}

      <AnimatePresence mode="wait">
        {mode === 'MENU' && (
          <motion.div key="menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-30">
            <DialogBox
              open
              text="어떤 서비스를 이용하시겠습니까?"
              textColor={COLORS.ac.creamWhite}
              options={[
                {
                  text: '대출',
                  onClick: () => {
                    setCalcValue(1);
                    setMode('CALC_LOAN');
                  },
                },
                {
                  text: '대출금 상환',
                  onClick: () => {
                    setCalcValue(1);
                    setMode('CALC_REPAY');
                  },
                },
              ]}
              optionDisabled={!isMyTurn}
            />
          </motion.div>
        )}

        {mode === 'CALC_LOAN' && (
          <motion.div key="calc_loan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-30">
            <AtmCalculator
              open
              mode="LOAN"
              value={calcValue}
              onChange={(v) => setCalcValue(Math.min(loanMax || 0, Math.max(1, Number(v || 1))))}
              loanRemain={loanMax}
              currentBell={userBell}
              max={loanMax}
              confirmText="결정"
              maxButtonText="전액"
              helperText={helperTextLoan}
              onConfirm={() => doConfirm('LOAN')}
            />
          </motion.div>
        )}

        {mode === 'CALC_REPAY' && (
          <motion.div key="calc_repay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-30">
            <AtmCalculator
              open
              mode="REPAY"
              value={calcValue}
              onChange={(v) => setCalcValue(Math.min(repayMax || 0, Math.max(1, Number(v || 1))))}
              loanRemain={userLoan}
              currentBell={userBell}
              max={repayMax}
              confirmText="결정"
              maxButtonText="전액"
              helperText={helperTextRepay}
              onConfirm={() => doConfirm('REPAY')}
            />
          </motion.div>
        )}

        {(mode === 'PROCESSING' || mode === 'DONE') && (
          <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-30">
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

            <DialogBox
              open
              text={mode === 'PROCESSING' ? '처리 중입니다...' : feedbackMsg}
              textColor={COLORS.ac.creamWhite}
              options={[]}
              optionDisabled
            />
          </motion.div>
        )}
      </AnimatePresence>

      {exitNode}
    </div>
  );
}
