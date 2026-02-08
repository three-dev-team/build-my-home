import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';

import { useGameTimer } from '../../../hooks/useGameTimer.js';
import { CHARACTERS } from '../../../constants/characters.js';
import { COLORS } from '../../../constants/colors.js';
import { iGa, eulReul } from '../../../constants/josa.js';

import LoanView from './LoanView.jsx';
const LOADING_MS = 3000;
const EXIT_AFTER_TYPING_MS = 3000;
const MAX_LOAN = 9999;
const WARN_AUTO_HIDE_MS = 2000;

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

  const characterName = useMemo(() => {
    const n = String(character?.name ?? '').trim();
    return n ? n : nickname;
  }, [character, nickname]);

  const { timeLeft } = useGameTimer(timeoutSeconds);
  const [mode, setMode] = useState('MENU');
  const [calcValue, setCalcValue] = useState(0);
  const [doneText, setDoneText] = useState('');
  const [doneHighlights, setDoneHighlights] = useState([]);
  const [doneTypingDone, setDoneTypingDone] = useState(false);
  const [warnText, setWarnText] = useState('');
  const [warnTypingDone, setWarnTypingDone] = useState(false);
  const prevModeRef = useRef('MENU');
  const warnHideRef = useRef(null);
  const exitTimerRef = useRef(null);
  const loadingTimerRef = useRef(null);
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
    if (warnHideRef.current) {
      clearTimeout(warnHideRef.current);
      warnHideRef.current = null;
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

  const handleBack = () => {
    if (mode === 'CALC_LOAN' || mode === 'CALC_REPAY') {
      confirmingRef.current = false;
      setMode('MENU');
      setCalcValue(0);
      return;
    }
    if (mode === 'NOTICE' || mode === 'LIMIT_WARN') {
      confirmingRef.current = false;
      setDoneTypingDone(false);
      setWarnTypingDone(false);
      setMode(prevModeRef.current || 'MENU');
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

  const remainingDebtCapacity = useMemo(() => Math.max(0, MAX_LOAN - Number(userLoan || 0)), [userLoan]);

  const remainingBorrowMax = useMemo(() => {
    const cap = remainingDebtCapacity;
    if (cap <= 0) return 0;
    if (isBankTile) return cap;
    return Math.max(0, Math.floor(cap / 1.1)); // ATM: 수수료 포함 한도
  }, [remainingDebtCapacity, isBankTile]);

  const repayMax = useMemo(
    () => Math.max(0, Math.min(Number(userLoan || 0), Number(userBell || 0))),
    [userLoan, userBell],
  );

  const helperTextLoan = useMemo(() => {
    const amount = Number(calcValue || 0);
    if (!Number.isFinite(amount) || amount <= 0) return '';

    if (isBankTile) {
      const totalDebt = Number(userLoan || 0) + amount;
      return `수수료 없음 (총 빚: ${fmt(totalDebt)}벨)`;
    }

    const fee = Math.floor(amount * 0.1);
    const totalDebt = Number(userLoan || 0) + amount + fee;
    return `수수료 ${fmt(fee)}벨 발생 (총 빚: ${fmt(totalDebt)}벨)`;
  }, [calcValue, userLoan, isBankTile]);

  const helperTextRepay = useMemo(() => {
    const left = Math.max(0, Number(userLoan || 0) - Number(calcValue || 0));
    return `상환 후 남은 빚: ${fmt(left)}벨`;
  }, [calcValue, userLoan]);

  const C = COLORS?.ac || {};
  const H_AMOUNT = C.yellow ?? C.orange ?? '#f2c94c';
  const H_FEE = C.orange ?? C.yellow ?? '#e76c21';
  const H_DEBT = C.nookCyan ?? C.mint ?? '#00b6a9';
  const H_NAME = character?.color ?? C.nookCyan ?? '#00b6a9';
  const WARN_RED = C.red ?? '#ff4d4f';

  const entryCharacterBox = character?.rightImage ? (
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

  const showLimitWarn = useCallback((text, returnMode = 'CALC_LOAN') => {
    clearTimers();
    prevModeRef.current = returnMode;
    setWarnTypingDone(false);
    setWarnText(text);
    setMode('LIMIT_WARN');
  }, []);

  const showNotice = (text, highlights = []) => {
    clearTimers();
    confirmingRef.current = false;
    setDoneTypingDone(false);
    setDoneText(text);
    setDoneHighlights(highlights);
    prevModeRef.current = 'MENU';
    setMode('NOTICE');
  };

  const showCreditBlockedNotice = () => {
    const maxStr = fmt(MAX_LOAN); // "9,999"
    const text = `${nickname}님은 대출금이 ${maxStr}벨이 있어\n신용불량자가 되었습니다\n더 이상의 대출은 불가능합니다`;

    showNotice(text, [
      { text: nickname, color: H_NAME },
      { text: `${maxStr}벨`, color: WARN_RED },
      { text: '신용불량자', color: WARN_RED },
    ]);
  };

  const showNoDebtNotice = () => {
    const text = `${nickname}님은 상환할 대출금이 없습니다`;
    showNotice(text, [{ text: nickname, color: H_NAME }]);
  };

  const validate = (type, amount) => {
    const val = Number(amount);

    if (type === 'LOAN') {
      if (Number(userLoan || 0) >= MAX_LOAN) return 'CREDIT_BLOCK';
      if (!Number.isFinite(val) || val <= 0) return 'MIN_1';
      if (val > remainingBorrowMax) return 'LIMIT';
      return '';
    }

    if (!Number.isFinite(val) || val <= 0) return '상환할 금액을 입력해줘.';
    if (val > repayMax) return '상환 가능한 금액을 초과했어.';
    return '';
  };

  const doConfirm = (type) => {
    if (!isMyTurn) return;
    if (mode === 'LOADING' || mode === 'DONE' || mode === 'NOTICE' || mode === 'LIMIT_WARN') return;

    if (confirmingRef.current) return;
    confirmingRef.current = true;

    const err = validate(type, calcValue);
    if (err) {
      confirmingRef.current = false;

      if (type === 'LOAN' && err === 'CREDIT_BLOCK') {
        showCreditBlockedNotice();
        return;
      }

      if (type === 'LOAN' && err === 'MIN_1') {
        showLimitWarn('1벨부터 대출 가능합니다', 'CALC_LOAN');
        return;
      }

      if (type === 'LOAN' && err === 'LIMIT') {
        const cap = remainingDebtCapacity;
        if (isBankTile) {
          showLimitWarn(`대출 한도를 넘었습니다\n대출 한도는 ${fmt(MAX_LOAN)}벨입니다`, 'CALC_LOAN');
        } else {
          showLimitWarn(
            `대출 한도를 넘었습니다\nATM 대출은 수수료 포함으로 한도가 계산됩니다\n남은 한도: ${fmt(cap)}벨`,
            'CALC_LOAN',
          );
        }
        return;
      }

      alert(err);
      return;
    }

    const amount = Number(calcValue || 0);
    const baseLoan = Number(userLoan || 0);

    clearTimers();
    setDoneTypingDone(false);
    setDoneText('');
    setDoneHighlights([]);

    if (type === 'LOAN') {
      onAction?.('LOAN_BORROW', { amount, isBankTile });
    } else {
      onAction?.('LOAN_REPAY', { amount, isBankTile });
    }

    setMode('LOADING');

    loadingTimerRef.current = setTimeout(() => {
      if (type === 'LOAN') {
        const fee = isBankTile ? 0 : Math.floor(amount * 0.1);
        const newDebt = baseLoan + amount + fee;

        const amountStr = `${fmt(amount)}벨`;
        const feeStr = `${fmt(fee)}벨`;
        const debtStr = `${fmt(newDebt)}벨`;

        if (isBankTile) {
          setDoneText(
            `${amountStr}을 ${characterName}의 계좌로 송금했습니다\n수수료는 없습니다\n현재 빚은 ${debtStr} 입니다`,
          );
          setDoneHighlights([
            { text: amountStr, color: H_AMOUNT },
            { text: debtStr, color: H_DEBT },
            { text: characterName, color: H_NAME },
          ]);
        } else {
          setDoneText(
            `${amountStr}을 ${characterName}의 계좌로 송금했습니다\n수수료 ${feeStr}이 부과되었습니다\n현재 빚은 ${debtStr} 입니다`,
          );
          setDoneHighlights([
            { text: amountStr, color: H_AMOUNT },
            { text: feeStr, color: H_FEE },
            { text: debtStr, color: H_DEBT },
            { text: characterName, color: H_NAME },
          ]);
        }
      } else {
        const leftDebt = Math.max(0, baseLoan - amount);

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
  }, [mode, doneTypingDone]);

  useEffect(() => {
    if (mode !== 'NOTICE') return;
    if (!doneTypingDone) return;

    clearTimers();
    exitTimerRef.current = setTimeout(() => {
      confirmingRef.current = false;
      setMode('MENU');
      setCalcValue(0);
      setDoneTypingDone(false);
    }, WARN_AUTO_HIDE_MS);
  }, [mode, doneTypingDone]);

  useEffect(() => {
    if (mode !== 'LIMIT_WARN') return;
    if (!warnTypingDone) return;

    clearTimers();
    warnHideRef.current = setTimeout(() => {
      setMode(prevModeRef.current || 'CALC_LOAN');
      setWarnTypingDone(false);
      setWarnText('');
    }, WARN_AUTO_HIDE_MS);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, warnTypingDone]);

  useEffect(() => {
    const debt = Number(userLoan || 0);
    if (debt > 0) return;
    if (mode !== 'CALC_REPAY') return;

    confirmingRef.current = false;
    setCalcValue(0);
    setMode('MENU');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLoan, mode]);

  const onMenuLoan = () => {
    confirmingRef.current = false;

    if (Number(userLoan || 0) >= MAX_LOAN) {
      showCreditBlockedNotice();
      return;
    }

    setCalcValue(0);
    setMode('CALC_LOAN');
  };

  const onMenuRepay = () => {
    confirmingRef.current = false;
    if (Number(userLoan || 0) <= 0) {
      showNoDebtNotice();
      return;
    }

    setCalcValue(0);
    setMode('CALC_REPAY');
  };

  const onChangeLoan = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) {
      setCalcValue(0);
      return;
    }

    if (n > remainingBorrowMax) {
      setCalcValue(remainingBorrowMax);
      if (isBankTile) {
        showLimitWarn(`대출 한도를 넘었습니다\n대출 한도는 ${fmt(MAX_LOAN)}벨입니다`, 'CALC_LOAN');
      } else {
        showLimitWarn(
          `대출 한도를 넘었습니다\nATM 대출은 (원금+수수료) 포함으로 한도가 계산됩니다\n남은 한도: ${fmt(remainingDebtCapacity)}벨`,
          'CALC_LOAN',
        );
      }
      return;
    }

    setCalcValue(Math.max(0, n));
  };

  const onChangeRepay = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) {
      setCalcValue(0);
      return;
    }
    setCalcValue(Math.max(0, Math.min(repayMax || 0, n)));
  };

  return (
    <LoanView
      isMyTurn={isMyTurn}
      mode={mode}
      entryCharacterBox={entryCharacterBox}
      nickname={nickname}
      userBell={userBell}
      userLoan={userLoan}
      calcValue={calcValue}
      repayMax={repayMax}
      remainingBorrowMax={remainingBorrowMax}
      doneText={doneText}
      doneHighlights={doneHighlights}
      warnText={warnText}
      warnRed={WARN_RED}
      helperTextLoan={helperTextLoan}
      helperTextRepay={helperTextRepay}
      onBack={handleBack}
      onExitReal={handleExitReal}
      onMenuLoan={onMenuLoan}
      onMenuRepay={onMenuRepay}
      onChangeLoan={onChangeLoan}
      onChangeRepay={onChangeRepay}
      onConfirmLoan={() => doConfirm('LOAN')}
      onConfirmRepay={() => doConfirm('REPAY')}
      onDoneTypingComplete={() => setDoneTypingDone(true)}
      onNoticeTypingComplete={() => setDoneTypingDone(true)}
      onWarnTypingComplete={() => setWarnTypingDone(true)}
    />
  );
}
