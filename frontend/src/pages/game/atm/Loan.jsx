import React, { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import DialogBox from '../../../components/common/DialogBox.jsx';
import ExitButton from '../../../components/common/ExitButton.jsx';
import AtmCalculator from './AtmCalculator.jsx';

import { useGameTimer } from '../../../hooks/useGameTimer.js';
import { MIN_LOAN_AMOUNT } from '../../../constants/gameConstants.js';
import { CHARACTERS } from '../../../constants/characters.js';
import { COLORS, withAlpha } from '../../../constants/colors.js';

const BG_ENTRY = '/images/board/bg-atm.webp';
const BG_CALC = '/images/board/bg-atm-calculator.webp';
const BG_LOADING = '/images/board/bg-atm-loading.webp';

const LOADING_MS = 3000;
const EXIT_AFTER_TYPING_MS = 3000;

const safeName = (v, fallback = '익명의 주민') => {
  const s = String(v ?? '').trim();
  if (!s) return fallback;
  if (s.includes('${')) return fallback;
  return s;
};

const findCharacter = (characterId) => {
  const id = Number(characterId);
  if (!Number.isFinite(id)) return null;
  return (CHARACTERS || []).find((c) => Number(c?.id) === id) || null;
};

const getFallbackCharacterId = () => {
  const keys = ['characterId', 'selectedCharacterId', 'currentCharacterId'];
  for (const k of keys) {
    const v = sessionStorage.getItem(k);
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
};

const fmt = (n) => Number(n || 0).toLocaleString();

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

  const nickname = useMemo(() => safeName(currentPlayerName), [currentPlayerName]);

  const resolvedCharacterId = useMemo(() => {
    if (currentPlayerCharacterId !== null && currentPlayerCharacterId !== undefined) return currentPlayerCharacterId;
    return getFallbackCharacterId();
  }, [currentPlayerCharacterId]);

  const character = useMemo(() => findCharacter(resolvedCharacterId), [resolvedCharacterId]);

  // ✅ 캐릭터 이름은 characters.js 기준
  const characterName = useMemo(() => {
    const n = String(character?.name ?? '').trim();
    return n ? n : nickname;
  }, [character, nickname]);

  const { timeLeft, isUrgent } = useGameTimer(timeoutSeconds);

  // MENU | CALC_LOAN | CALC_REPAY | LOADING | DONE
  const [mode, setMode] = useState('MENU');
  const [calcValue, setCalcValue] = useState(1);

  const [doneText, setDoneText] = useState('');
  const [doneHighlights, setDoneHighlights] = useState([]);
  const [doneTypingDone, setDoneTypingDone] = useState(false);

  const exitTimerRef = useRef(null);
  const loadingTimerRef = useRef(null);

  // ✅ confirm 중복 실행 방지
  const confirmingRef = useRef(false);

  const clearTimers = () => {
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }
  };

  useEffect(() => () => clearTimers(), []);

  const handleExitReal = () => {
    clearTimers();
    confirmingRef.current = false;

    if (isBankTile) {
      onExit?.();
      return;
    }
    onClose?.();
  };

  // ✅ 나가기 버튼 = 뒤로가기
  const handleBack = () => {
    if (mode === 'CALC_LOAN' || mode === 'CALC_REPAY') {
      confirmingRef.current = false;
      setMode('MENU');
      setCalcValue(1);
      return;
    }
    if (mode === 'MENU') {
      handleExitReal();
    }
  };

  useEffect(() => {
    if (timeoutSeconds > 0 && timeLeft === 0) handleExitReal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

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

  const LOAN_TEST_MAX = 999999999;

  const repayMax = useMemo(
    () => Math.max(0, Math.min(Number(userLoan || 0), Number(userBell || 0))),
    [userLoan, userBell],
  );

  const helperTextLoan = useMemo(() => {
    const fee = Math.floor(Number(calcValue || 0) * 0.1);
    if (!Number.isFinite(fee) || fee <= 0) return '';
    const totalDebt = Number(userLoan || 0) + Number(calcValue || 0) + fee;
    return `수수료 ${fmt(fee)}벨 발생 (총 빚: ${fmt(totalDebt)}벨)`;
  }, [calcValue, userLoan]);

  const helperTextRepay = useMemo(() => {
    const left = Math.max(0, Number(userLoan || 0) - Number(calcValue || 0));
    return `상환 후 남은 빚: ${fmt(left)}벨`;
  }, [calcValue, userLoan]);

  const validate = (type, amount) => {
    const val = Number(amount);

    if (type === 'LOAN') {
      if (val < MIN_LOAN_AMOUNT) return `${MIN_LOAN_AMOUNT}벨 부터 거래 가능해.`;
      if (val % 50 !== 0) return '50벨 단위로만 거래 가능해.';
      return '';
    }

    if (val <= 0) return '상환할 금액을 입력해줘.';
    if (val > repayMax) return '상환 가능한 금액을 초과했어.';
    if (val % 50 !== 0) return '50벨 단위로만 거래 가능해.';
    return '';
  };

  // ✅ colors.js 기반 하이라이트 색(없으면 fallback)
  const C = COLORS?.ac || {};
  const H_AMOUNT = C.yellow ?? C.orange ?? '#f2c94c';
  const H_FEE = C.orange ?? C.yellow ?? '#e76c21';
  const H_DEBT = C.nookCyan ?? C.mint ?? '#00b6a9';
  const H_NAME = character?.color ?? C.nookCyan ?? '#00b6a9';

  const doConfirm = (type) => {
    if (!isMyTurn) return;
    if (mode === 'LOADING' || mode === 'DONE') return;

    if (confirmingRef.current) return;
    confirmingRef.current = true;

    const err = validate(type, calcValue);
    if (err) {
      confirmingRef.current = false;
      alert(err);
      return;
    }

    clearTimers();
    setDoneTypingDone(false);
    setDoneText('');
    setDoneHighlights([]);

    setMode('LOADING');

    loadingTimerRef.current = setTimeout(() => {
      const amount = Number(calcValue || 0);

      if (type === 'LOAN') {
        const fee = Math.floor(amount * 0.1);
        const newDebt = Number(userLoan || 0) + amount + fee;

        onAction?.('LOAN_BORROW', { amount, isBankTile });

        const amountStr = `${fmt(amount)}벨`;
        const feeStr = `${fmt(fee)}벨`;
        const debtStr = `${fmt(newDebt)}벨`;

        setDoneText(
          `${amountStr}을 ${characterName}의 계좌로 송금했습니다\n` +
          `수수료 ${feeStr}이 부과되었습니다\n` +
          `현재 빚은 ${debtStr} 입니다`,
        );

        setDoneHighlights([
          { text: amountStr, color: H_AMOUNT },
          { text: feeStr, color: H_FEE },
          { text: debtStr, color: H_DEBT },
          { text: characterName, color: H_NAME },
        ]);
      } else {
        const leftDebt = Math.max(0, Number(userLoan || 0) - amount);

        onAction?.('LOAN_REPAY', { amount, isBankTile });

        const amountStr = `${fmt(amount)}벨`;
        const debtStr = `${fmt(leftDebt)}벨`;

        setDoneText(`${amountStr}이 상환되었습니다\n현재 빚은 ${debtStr} 입니다`);

        setDoneHighlights([
          { text: amountStr, color: H_AMOUNT },
          { text: debtStr, color: H_DEBT },
        ]);
      }

      setMode('DONE');
    }, LOADING_MS);
  };

  useEffect(() => {
    if (mode !== 'DONE') return;
    if (!doneTypingDone) return;

    clearTimers();
    exitTimerRef.current = setTimeout(() => {
      confirmingRef.current = false;
      handleExitReal();
    }, EXIT_AFTER_TYPING_MS);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, doneTypingDone]);

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

  const loadingScene = (
    <div style={sceneScaleStyle}>
      <img src={BG_LOADING} alt="atm-loading-bg" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          fontFamily: 'var(--font-gosanja)',
          fontSize: 'calc(60 * var(--s))',
          color: C.green ?? '#43991a',
          textAlign: 'center',
          whiteSpace: 'pre-line',
        }}
      >
        처리중입니다...
      </div>
    </div>
  );

  // ✅ 처리중/결과에서는 나가기 버튼 없음
  const showBackButtonMyTurn = isMyTurn && (mode === 'MENU' || mode === 'CALC_LOAN' || mode === 'CALC_REPAY');

  // ---------------- 관전자 ----------------
  if (!isMyTurn) {
    return (
      <div className={rootClass}>
        {entryScene}
        {topTimer}

        <DialogBox
          open
          text={`${nickname} 님이 ATM을 이용중입니다\n보안 상의 이유로 잠시만 대기해주세요`}
          textColor={C.creamWhite ?? '#FDFBF6'}
          options={[]}
          optionDisabled
        />

        <ExitButton onClick={handleExitReal} disabled={false} />
      </div>
    );
  }

  const isCalc = mode === 'CALC_LOAN' || mode === 'CALC_REPAY';

  return (
    <div className={rootClass}>
      {mode === 'LOADING' && loadingScene}

      {isCalc && mode !== 'LOADING' && (
        <img src={BG_CALC} alt="atm-calc-bg" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
      )}

      {!isCalc && mode !== 'LOADING' && entryScene}

      {topTimer}

      <AnimatePresence mode="wait">
        {mode === 'MENU' && (
          <motion.div key="menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-30">
            <DialogBox
              open
              text="어떤 서비스를 이용하시겠습니까?"
              textColor={C.creamWhite ?? '#FDFBF6'}
              options={[
                {
                  text: '대출',
                  onClick: () => {
                    confirmingRef.current = false;
                    setCalcValue(1);
                    setMode('CALC_LOAN');
                  },
                },
                {
                  text: '대출금 상환',
                  onClick: () => {
                    confirmingRef.current = false;
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
              onChange={(v) => setCalcValue(Math.min(LOAN_TEST_MAX, Math.max(1, Number(v || 1))))}
              loanRemain={userLoan}
              currentBell={userBell}
              max={LOAN_TEST_MAX}
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

        {mode === 'DONE' && (
          <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-30">
            <DialogBox
              open
              text={doneText}
              textColor={C.creamWhite ?? '#FDFBF6'}
              highlights={doneHighlights}
              options={[]}
              optionDisabled
              typingSpeed={40}
              onTypingComplete={() => setDoneTypingDone(true)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {showBackButtonMyTurn && <ExitButton onClick={handleBack} disabled={false} />}
    </div>
  );
}
