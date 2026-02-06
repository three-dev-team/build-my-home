import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import DialogBox from '../../../components/common/DialogBox.jsx';
import ExitButton from '../../../components/common/ExitButton.jsx';
import AutoMove from '../../../components/common/AutoMove.jsx';
import AtmCalculator from './AtmCalculator.jsx';

import { COLORS } from '../../../constants/colors.js';
import { withAlpha } from '../../../constants/colors.js';

const BG_ENTRY = '/images/board/bg-atm.webp';
const BG_CALC = '/images/board/bg-atm-calculator.webp';
const BG_LOADING = '/images/board/bg-atm-loading.webp';

export default function LoanView({
                                   isMyTurn,
                                   mode,
                                   entryCharacterBox,
                                   nickname,
                                   userBell,
                                   userLoan,
                                   calcValue,
                                   repayMax,
                                   remainingBorrowMax,
                                   doneText,
                                   doneHighlights,
                                   warnText,
                                   warnRed,
                                   helperTextLoan,
                                   helperTextRepay,
                                   onBack,
                                   onExitReal,
                                   onMenuLoan,
                                   onMenuRepay,
                                   onChangeLoan,
                                   onChangeRepay,
                                   onConfirmLoan,
                                   onConfirmRepay,
                                   onDoneTypingComplete,
                                   onNoticeTypingComplete,
                                   onWarnTypingComplete,
                                 }) {
  const C = COLORS?.ac || {};

  const rootClass = 'absolute inset-0 z-[30000] overflow-hidden select-none';

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

  const entryScene = (
    <div style={sceneScaleStyle}>
      <img src={BG_ENTRY} alt="atm-entry-bg" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
      {entryCharacterBox}
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

  const isCalc = mode === 'CALC_LOAN' || mode === 'CALC_REPAY';
  const showBackButtonMyTurn =
    isMyTurn && (mode === 'MENU' || mode === 'CALC_LOAN' || mode === 'CALC_REPAY' || mode === 'NOTICE' || mode === 'LIMIT_WARN');

  // ---------------- 관전자 ----------------
  if (!isMyTurn) {
    return (
      <div className={rootClass}>
        {entryScene}

        <DialogBox
          open
          text={`${nickname} 님이 ATM을 이용중입니다\n보안 상의 이유로 잠시만 대기해주세요`}
          textColor={C.creamWhite ?? '#FDFBF6'}
          options={[]}
          optionDisabled
        />

        <ExitButton onClick={onExitReal} disabled={false} />
      </div>
    );
  }

  return (
    <div className={rootClass}>
      {mode === 'LOADING' && loadingScene}

      {isCalc && mode !== 'LOADING' && (
        <img src={BG_CALC} alt="atm-calc-bg" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
      )}

      {!isCalc && mode !== 'LOADING' && entryScene}

      <AnimatePresence mode="wait">
        {mode === 'MENU' && (
          <motion.div key="menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-30">
            <DialogBox
              open
              text="어떤 서비스를 이용하시겠습니까?"
              textColor={C.creamWhite ?? '#FDFBF6'}
              options={[
                { text: '대출', onClick: onMenuLoan },
                { text: '대출금 상환', onClick: onMenuRepay },
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
              onChange={onChangeLoan}
              loanRemain={userLoan}
              currentBell={userBell}
              max={remainingBorrowMax}
              confirmText="결정"
              maxButtonText="전액"
              helperText={helperTextLoan}
              onConfirm={onConfirmLoan}
            />
          </motion.div>
        )}

        {mode === 'CALC_REPAY' && (
          <motion.div key="calc_repay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-30">
            <AtmCalculator
              open
              mode="REPAY"
              value={calcValue}
              onChange={onChangeRepay}
              loanRemain={userLoan}
              currentBell={userBell}
              max={repayMax}
              confirmText="결정"
              maxButtonText="전액"
              helperText={helperTextRepay}
              onConfirm={onConfirmRepay}
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
              onTypingComplete={onDoneTypingComplete}
            />
            <AutoMove />
          </motion.div>
        )}

        {mode === 'NOTICE' && (
          <motion.div key="notice" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-30">
            <DialogBox
              open
              text={doneText}
              textColor={C.creamWhite ?? '#FDFBF6'}
              highlights={doneHighlights}
              options={[]}
              optionDisabled
              typingSpeed={40}
              onTypingComplete={onNoticeTypingComplete}
            />
          </motion.div>
        )}

        {mode === 'LIMIT_WARN' && (
          <motion.div key="limit_warn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-40">
            <DialogBox
              open
              text={warnText}
              textColor={warnRed}
              highlights={[]}
              options={[]}
              optionDisabled
              typingSpeed={40}
              onTypingComplete={onWarnTypingComplete}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {showBackButtonMyTurn && <ExitButton onClick={onBack} disabled={false} />}
    </div>
  );
}
