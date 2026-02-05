// RadishSell.jsx
import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';

import AspectLayout from '../../../components/layout/AspectLayout.jsx';
import ExitButton from '../../../components/common/ExitButton.jsx';
import Subtitle from '../../../components/common/Subtitle.jsx';

import RadishSellComplete from './RadishSellComplete.jsx';
import RadishSellInput from './RadishSellInput.jsx';

import { COLORS, withAlpha } from '../../../constants/colors.js';
import { CHARACTERS } from '../../../constants/characters.js';

const px = (n) => `calc(${n} * var(--s))`;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

const getPlayerName = (player) => String(player?.nickname ?? '').trim();

const getPlayerCharacter = (player) => {
  const id = Number(player?.characterId ?? player?.character?.id ?? player?.character ?? 0);
  if (!id) return null;
  return (CHARACTERS || []).find((c) => Number(c?.id) === id) || null;
};

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

  // ✅ "결정" 누른 순간의 확정값(서버 값 오기 전까지 완료 화면에서 사용)
  const [confirmed, setConfirmed] = useState(null); // { qty, amount }

  const priceNum = useMemo(() => Number(radishPrice || 0), [radishPrice]);
  const priceText = useMemo(() => priceNum.toLocaleString(), [priceNum]);

  // ✅ 입력(step=1)에서만 owned qty 기준으로 입력값 clamp
  useEffect(() => {
    if (step !== 1) return;
    const max = Math.max(1, radishQty || 1);
    setSellQty((q) => clamp(Number(q) || 1, 1, max));
  }, [radishQty, step]);

  // ✅ step이 0으로 돌아오면 confirmed 초기화
  useEffect(() => {
    if (step === 0) setConfirmed(null);
  }, [step]);

  const safeQty = useMemo(() => {
    const max = Math.max(1, radishQty || 1);
    return clamp(Number(sellQty) || 1, 1, max);
  }, [sellQty, radishQty]);

  const expectedAmount = useMemo(() => safeQty * priceNum, [safeQty, priceNum]);

  const setStep = (next) => {
    if (!isMyTurn) return;
    onAction?.('SET_STEP', { uiStep: next });
  };

  const handleSell = () => {
    if (!canSell) return;

    // ✅ 결정 순간 qty/amount를 확정값으로 저장
    const qty = safeQty;
    const amount = qty * priceNum;
    setConfirmed({ qty, amount });

    onAction?.('RADISH_SELL', { quantity: qty });
  };

  const pName = useMemo(() => getPlayerName(player), [player]);
  const pChar = useMemo(() => getPlayerCharacter(player), [player]);

  const playerColor = useMemo(() => {
    const c = String(pChar?.color || '').trim();
    return c || COLORS.ac.nookCyan;
  }, [pChar]);

  const rightImgSrc = useMemo(() => {
    const src = String(pChar?.stampImage ?? '').trim();
    return src;
  }, [pChar]);

  const naugulNameBox = COLORS?.characters?.naugul?.nameBox ?? COLORS.ac.nookCyan;
  const naugulNameText = COLORS?.characters?.naugul?.nameText ?? COLORS.ac.darkBrown;

  const BG = '/images/board/bg-mupanisell.webp';

  const highlightsStep0 = useMemo(() => {
    const hs = [];
    if (pName) hs.push({ text: pName, color: playerColor });
    if (priceText) hs.push({ text: priceText, color: COLORS.ac.nookCyan });
    return hs;
  }, [pName, playerColor, priceText]);

  const overlayDim = useMemo(() => withAlpha(COLORS.ac.black, 0.06), []);

  // ✅ 서버 값이 있으면 서버 값 우선, 없으면 confirmed(결정값) 사용
  const soldQty = useMemo(() => {
    const serverQty = Number(player?.quantity ?? player?.lastTradeQty);
    if (Number.isFinite(serverQty) && serverQty > 0) return serverQty;
    if (confirmed?.qty != null) return Number(confirmed.qty) || 0;
    return 0;
  }, [player, confirmed]);

  const soldAmount = useMemo(() => {
    const serverAmt = Number(player?.amount ?? player?.lastTradeAmount);
    if (Number.isFinite(serverAmt) && serverAmt >= 0) return serverAmt;
    if (confirmed?.amount != null) return Number(confirmed.amount) || 0;
    return 0;
  }, [player, confirmed]);

  const renderContent = () => {
    if (step === 0) {
      const hello = pName ? `${pName} 님` : '손님';

      return (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 22000,
            pointerEvents: 'none',
          }}
        >
          <div
            role="button"
            tabIndex={0}
            onClick={() => setStep(1)}
            onKeyDown={(e) => {
              if (!isMyTurn) return;
              if (e.key === 'Enter' || e.key === ' ') setStep(1);
            }}
            style={{
              pointerEvents: 'auto',
              cursor: isMyTurn ? 'pointer' : 'default',
              outline: 'none',
              display: 'inline-block',
            }}
          >
            <div style={{ pointerEvents: 'none' }}>
              <Subtitle
                nameText="콩돌이"
                nameColor={naugulNameBox}
                nameTextColor={naugulNameText}
                contentText={
                  pName
                    ? `${hello} 안녕하세요 -! 안녕하세요 -!\n지금 시간대의 무 가격은\n1개에 ${priceText}벨입니다 -! 입니다다-!`
                    : `안녕하세요 -! 안녕하세요 -!\n지금 시간대의 무 가격은\n1개에 ${priceText}벨입니다 -! 입니다다-!`
                }
                highlights={highlightsStep0}
                contentColor={COLORS.subtitle.contentBox}
                contentTextColor={COLORS.subtitle.contentText}
                showTriangle
              />
            </div>
          </div>
        </div>
      );
    }

    if (step === 1) {
      return (
        <RadishSellInput
          open
          price={priceNum}
          maxQty={Math.max(1, radishQty || 1)}
          value={safeQty}
          ownedQty={radishQty}
          onChange={(v) => setSellQty(v)}
          onConfirm={handleSell}
          canConfirm={canSell}
          confirmText="결정"
          maxButtonText="팔 수 있는 만큼"
        />
      );
    }

    return (
      <RadishSellComplete
        open
        nameText="콩돌이"
        nameColor={naugulNameBox}
        nameTextColor={naugulNameText}
        soldQty={soldQty}
        soldAmount={soldAmount}
        afterTypedExitMs={3000}
        onExit={onClose}
      />
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[30000]">
      <AspectLayout>
        <div
          className="relative w-full h-full overflow-hidden"
          style={{
            ['--s']: 'min(calc(100cqw / 1920), calc(100cqh / 1080))',
            ['--mupani-nookCyan']: COLORS.ac.nookCyan,
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              background: `url('${BG}') center / cover no-repeat`,
            }}
          />
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              background: overlayDim,
            }}
          />

          {rightImgSrc ? (
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                width: px(280),
                height: px(560),
                right: px(560),
                bottom: px(268),
                overflow: 'hidden',
                pointerEvents: 'none',
                zIndex: 12000,
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'flex-end',
              }}
            >
              <img
                src={rightImgSrc}
                alt=""
                draggable={false}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  objectPosition: 'right bottom',
                  display: 'block',
                  maxWidth: '100%',
                  maxHeight: '100%',
                }}
              />
            </div>
          ) : null}

          {renderContent()}

          {step !== 2 ? (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 60000,
                pointerEvents: 'none',
              }}
            >
              <div style={{ pointerEvents: 'auto' }}>
                <ExitButton onClick={onClose} label="나가기" disabled={false} />
              </div>
            </div>
          ) : null}
        </div>
      </AspectLayout>
    </motion.div>
  );
}
