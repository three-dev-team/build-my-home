// src/pages/game/RadishSell.jsx
import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';

import AspectLayout from '../../components/layout/AspectLayout.jsx';
import ExitButton from '../../components/common/ExitButton.jsx';
import InstructionText from '../../components/common/InstructionText.jsx';
import Subtitle from '../../components/common/Subtitle.jsx';
import { COLORS } from '../../constants/colors.js';

const px = (n) => `calc(${n} * var(--s))`;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export default function RadishSell({
                                     isMyTurn,
                                     player,
                                     currentPlayerName,
                                     radishPrice = 0,
                                     onAction,
                                     onClose,
                                   }) {
  const step = Number(player?.uiStep ?? 0);

  const radishQty = Number(player?.radishQty ?? 0);
  const canSell = !!isMyTurn && radishQty > 0 && typeof onAction === 'function';

  const [sellQty, setSellQty] = useState(1);

  // 보유 수량이 변하면 안전하게 보정
  useEffect(() => {
    const max = Math.max(1, radishQty || 1);
    setSellQty((q) => clamp(Number(q) || 1, 1, max));
  }, [radishQty]);

  const safeQty = useMemo(() => {
    const max = Math.max(1, radishQty || 1);
    return clamp(Number(sellQty) || 1, 1, max);
  }, [sellQty, radishQty]);

  const expectedAmount = useMemo(() => safeQty * Number(radishPrice || 0), [safeQty, radishPrice]);

  const setStep = (next) => {
    if (!isMyTurn) return;
    onAction?.('SET_STEP', { uiStep: next });
  };

  const goNext = () => {
    // step 0 -> 1
    if (step === 0) setStep(1);
    // step 2 -> close
    else if (step === 2) onClose?.();
  };

  const goBack = () => {
    // step 1 -> 0
    if (step === 1) setStep(0);
    else onClose?.();
  };

  const handleSell = () => {
    if (!canSell) return;
    onAction?.('RADISH_SELL', { quantity: safeQty });
    // 서버에서 RADISH_SOLD 오면 player.uiStep=2로 바뀌는 구조를 기대
    // (혹시 서버에서 안 바꾸면 여기서 setStep(2) 해도 되는데,
    //  지금 너 GameWsController에서 RADISH_SOLD일 때 player.setUiStep(2) 하니까 건드리지 않음)
  };

  // 결과 화면에 표시할 텍스트(서버에서 amount/quantity 내려오면 그걸 우선)
  const soldQty = Number(player?.quantity ?? player?.lastTradeQty ?? safeQty); // fallback
  const soldAmount = Number(player?.amount ?? player?.lastTradeAmount ?? expectedAmount); // fallback

  const title = currentPlayerName ? `${currentPlayerName}의 무 판매` : '무 판매';

  // 버튼 옵션(Subtitle 옵션 스타일 맞추려고 options 사용)
  const optionsStep0 = [
    {
      text: '판매하러 가기',
      onClick: () => setStep(1),
    },
    {
      text: '돌아가기',
      onClick: onClose,
    },
  ];

  const optionsStep1 = [
    {
      text: '판매하기',
      onClick: handleSell,
    },
    {
      text: '이전',
      onClick: () => setStep(0),
    },
  ];

  const optionsStep2 = [
    {
      text: '확인',
      onClick: onClose,
    },
  ];

  const renderContent = () => {
    // step 0: 안내
    if (step === 0) {
      return (
        <>
          <Subtitle
            nameText="콩돌"
            nameColor={COLORS.ac.darkBrown}
            nameTextColor={COLORS.ac.creamWhite}
            contentText={
              radishQty > 0
                ? `지금 시세로 무를 팔면 꽤 짭짤하구리!\n보유 무: ${radishQty}개`
                : '지금은 팔 무가 없다구리!\n무를 먼저 사 와야 한다구리~'
            }
            contentColor={COLORS.ac.creamIvory}
            contentTextColor={COLORS.ac.darkBrown}
            options={optionsStep0}
            optionColor={COLORS.ac.darkBrown}
            optionTextColor={COLORS.ac.creamWhite}
            optionDisabled={!isMyTurn}
            showTriangle
          />
        </>
      );
    }

    // step 1: 수량 선택 + 판매
    if (step === 1) {
      return (
        <>
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: px(290),
              transform: 'translateX(-50%)',
              width: px(980),
              borderRadius: px(26),
              background: COLORS.ac.creamIvory,
              padding: px(34),
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{ fontSize: px(34), fontWeight: 900, color: COLORS.ac.darkBrown }}>
                {title}
              </div>
              <div style={{ fontSize: px(26), fontWeight: 900, color: COLORS.ac.darkBrown }}>
                현재 시세: {Number(radishPrice || 0).toLocaleString()}벨
              </div>
            </div>

            <div
              style={{
                marginTop: px(24),
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: px(18),
                fontSize: px(26),
                fontWeight: 900,
                color: COLORS.ac.darkBrown,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>보유 무</span>
                <span>{radishQty.toLocaleString()}개</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>예상 판매액</span>
                <span>{expectedAmount.toLocaleString()}벨</span>
              </div>
            </div>

            {/* 수량 조절 */}
            <div
              style={{
                marginTop: px(26),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: px(18),
              }}
            >
              <button
                type="button"
                disabled={!canSell}
                onClick={() => setSellQty((q) => clamp((Number(q) || 1) - 1, 1, Math.max(1, radishQty || 1)))}
                style={{
                  width: px(80),
                  height: px(80),
                  borderRadius: '50%',
                  background: COLORS.ac.creamWhite,
                  color: COLORS.ac.darkBrown,
                  border: `solid ${px(4)} ${COLORS.ac.darkBrown}`,
                  fontSize: px(42),
                  fontWeight: 900,
                  opacity: canSell ? 1 : 0.5,
                }}
              >
                -
              </button>

              <div
                style={{
                  minWidth: px(160),
                  textAlign: 'center',
                  fontSize: px(54),
                  fontWeight: 900,
                  color: COLORS.ac.darkBrown,
                }}
              >
                {safeQty}
              </div>

              <button
                type="button"
                disabled={!canSell}
                onClick={() => setSellQty((q) => clamp((Number(q) || 1) + 1, 1, Math.max(1, radishQty || 1)))}
                style={{
                  width: px(80),
                  height: px(80),
                  borderRadius: '50%',
                  background: COLORS.ac.creamWhite,
                  color: COLORS.ac.darkBrown,
                  border: `solid ${px(4)} ${COLORS.ac.darkBrown}`,
                  fontSize: px(42),
                  fontWeight: 900,
                  opacity: canSell ? 1 : 0.5,
                }}
              >
                +
              </button>
            </div>
          </div>

          <Subtitle
            nameText="콩돌"
            nameColor={COLORS.ac.darkBrown}
            nameTextColor={COLORS.ac.creamWhite}
            contentText={
              !isMyTurn
                ? '지금은 네 차례가 아니라서 판매할 수 없다구리.'
                : radishQty <= 0
                  ? '보유한 무가 없어서 판매할 수 없다구리.'
                  : '수량을 고르고 판매하기를 누르면 된다구리!'
            }
            contentColor={COLORS.ac.creamIvory}
            contentTextColor={COLORS.ac.darkBrown}
            options={optionsStep1}
            optionColor={COLORS.ac.darkBrown}
            optionTextColor={COLORS.ac.creamWhite}
            optionDisabled={!canSell}
            showTriangle
          />
        </>
      );
    }

    // step 2: 결과
    return (
      <Subtitle
        nameText="콩돌"
        nameColor={COLORS.ac.darkBrown}
        nameTextColor={COLORS.ac.creamWhite}
        contentText={`성공적으로 판매했다구리!\n${soldQty.toLocaleString()}개에 ${soldAmount.toLocaleString()}벨을 받았다구리.`}
        contentColor={COLORS.ac.creamIvory}
        contentTextColor={COLORS.ac.darkBrown}
        options={optionsStep2}
        optionColor={COLORS.ac.darkBrown}
        optionTextColor={COLORS.ac.creamWhite}
        optionDisabled={!isMyTurn}
        showTriangle
      />
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[30000]"
    >
      <AspectLayout>
        <div
          className="relative w-full h-full overflow-hidden"
          style={{
            containerType: 'size',
            ['--s']: 'calc(100cqw / 1920)',
          }}
        >
          {/* 배경 어둡게(완전 까맣게 X) */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.18)',
            }}
          />

          {/* 메인 UI */}
          {renderContent()}

          {/* ExitButton: House처럼 absolute */}
          <ExitButton
            onClick={onClose}
            label="뒤로가기"
            showShadow={false}
            disabled={false}
            style={{
              position: 'absolute',
              right: px(30),
              bottom: px(28),
              zIndex: 10,
            }}
          />

          <InstructionText>
            {step === 0
              ? '무를 팔아서 벨을 벌 수 있어요'
              : step === 1
                ? '수량을 정하고 판매하기를 눌러 주세요'
                : '확인을 누르면 보드로 돌아가요'}
          </InstructionText>
        </div>
      </AspectLayout>
    </motion.div>
  );
}
