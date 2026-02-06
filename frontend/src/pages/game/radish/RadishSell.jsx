// RadishSell.jsx (풀코드) ✅ 루트 tradeQty/tradeAmount를 받아 0개/0벨 문제 해결
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
                                     player, // ✅ 내 player(입력/판매에 사용)
                                     actorPlayer, // ✅ 화면 표시 기준 player(현재 턴 플레이어를 넣어주면 관전/전체 동기화됨)
                                     currentPlayerName,
                                     radishPrice = 0,

                                     // ✅ [중요] 서버(GameMessage) 최상위에 오는 값들
                                     tradeQty, // gameState.quantity
                                     tradeAmount, // gameState.amount
                                     tradeMemberId, // gameState.memberId

                                     onAction,
                                     onClose,
                                   }) {

  const viewPlayer = actorPlayer ?? player;
  const step = Number(viewPlayer?.uiStep ?? 0);
  const radishQty = Number(player?.radishQty ?? 0);
  const canSell = !!isMyTurn && radishQty > 0 && typeof onAction === 'function';
  const [sellQty, setSellQty] = useState(1);
  const [confirmed, setConfirmed] = useState(null); // { qty, amount }
  const priceNum = useMemo(() => Number(radishPrice || 0), [radishPrice]);
  const priceText = useMemo(() => priceNum.toLocaleString(), [priceNum]);

  useEffect(() => {
    if (step !== 1) return;
    const max = Math.max(1, radishQty || 1);
    setSellQty((q) => clamp(Number(q) || 1, 1, max));
  }, [radishQty, step]);

  useEffect(() => {
    if (step === 0) setConfirmed(null);
  }, [step]);

  const safeQty = useMemo(() => {
    const max = Math.max(1, radishQty || 1);
    return clamp(Number(sellQty) || 1, 1, max);
  }, [sellQty, radishQty]);

  const setStep = (next) => {
    if (!isMyTurn) return;
    onAction?.('SET_STEP', { uiStep: next });
  };

  const handleSell = () => {
    if (!canSell) return;

    const qty = safeQty;
    const amount = qty * priceNum;
    setConfirmed({ qty, amount });

    onAction?.('RADISH_SELL', { quantity: qty });
  };

  const pName = useMemo(() => getPlayerName(viewPlayer), [viewPlayer]);
  const pChar = useMemo(() => getPlayerCharacter(viewPlayer), [viewPlayer]);

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

  // ✅ [핵심] 서버가 보내는 tradeQty/tradeAmount는 "메시지 최상위"에 있음
  // - tradeMemberId가 있으면 그 멤버의 거래 결과로 간주
  // - 없으면(혹은 연결 못 했으면) 내 턴일 때만 confirmed fallback
  const isTradeForViewPlayer = useMemo(() => {
    const tId = Number(tradeMemberId);
    const vId = Number(viewPlayer?.memberId ?? viewPlayer?.id);
    if (!Number.isFinite(tId) || !Number.isFinite(vId)) return false;
    return tId === vId;
  }, [tradeMemberId, viewPlayer]);

  const soldQty = useMemo(() => {
    const serverQtyRoot = Number(tradeQty);
    if (Number.isFinite(serverQtyRoot) && serverQtyRoot > 0) {
      // tradeMemberId가 맞으면 그 값을 보여주고,
      // tradeMemberId가 없으면(구버전/누락) 내 턴일 때만 보여줌
      if (isTradeForViewPlayer || (tradeMemberId == null && isMyTurn)) return serverQtyRoot;
    }

    // ✅ 기존(플레이어 객체 내) 필드도 혹시 있을 수 있으니 남겨둠
    const serverQtyInPlayer = Number(viewPlayer?.quantity ?? viewPlayer?.lastTradeQty);
    if (Number.isFinite(serverQtyInPlayer) && serverQtyInPlayer > 0) return serverQtyInPlayer;

    if (isMyTurn && confirmed?.qty != null) return Number(confirmed.qty) || 0;
    return 0;
  }, [tradeQty, tradeMemberId, isTradeForViewPlayer, isMyTurn, viewPlayer, confirmed]);

  const soldAmount = useMemo(() => {
    const serverAmtRoot = Number(tradeAmount);
    if (Number.isFinite(serverAmtRoot) && serverAmtRoot >= 0) {
      if (isTradeForViewPlayer || (tradeMemberId == null && isMyTurn)) return serverAmtRoot;
    }

    const serverAmtInPlayer = Number(viewPlayer?.amount ?? viewPlayer?.lastTradeAmount);
    if (Number.isFinite(serverAmtInPlayer) && serverAmtInPlayer >= 0) return serverAmtInPlayer;

    if (isMyTurn && confirmed?.amount != null) return Number(confirmed.amount) || 0;
    return 0;
  }, [tradeAmount, tradeMemberId, isTradeForViewPlayer, isMyTurn, viewPlayer, confirmed]);

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
