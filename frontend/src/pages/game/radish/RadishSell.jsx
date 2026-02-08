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
                                     player, // 내 player(입력/판매 액션에 사용)
                                     actorPlayer, // 화면 표시 기준 player(현재 턴 플레이어 기준으로 보이게 할 때 사용)
                                     currentPlayerName,
                                     radishPrice = 0,

                                     // 서버(GameMessage) 최상위 trade 값들
                                     tradeQty,
                                     tradeAmount,
                                     tradeMemberId,

                                     onAction,
                                     onClose,
                                   }) {
  // 화면에 보여줄 플레이어(턴 플레이어 기준 동기화)
  const viewPlayer = actorPlayer ?? player;
  const step = Number(viewPlayer?.uiStep ?? 0);

  // 입력 UI(보유수/최대치)는 항상 viewPlayer(현재 턴 플레이어) 기준
  const viewRadishQty = Number(viewPlayer?.radishQty ?? 0);

  // 내 턴 + 보유 무 있음 + onAction 가능일 때만 판매 가능
  const canSell = !!isMyTurn && viewRadishQty > 0 && typeof onAction === 'function';

  // 관전자는 어떤 입력/클릭도 불가
  const interactive = !!isMyTurn;

  const [sellQty, setSellQty] = useState(1);
  const [confirmed, setConfirmed] = useState(null); // { qty, amount }

  const priceNum = useMemo(() => Number(radishPrice || 0), [radishPrice]);
  const priceText = useMemo(() => priceNum.toLocaleString(), [priceNum]);

  // step=1(입력 화면)에서 보유 수량이 바뀌면 입력값을 1~max로 보정
  useEffect(() => {
    if (step !== 1) return;
    const max = Math.max(1, viewRadishQty || 1);
    setSellQty((q) => clamp(Number(q) || 1, 1, max));
  }, [viewRadishQty, step]);

  // step=0(인트로)로 돌아오면 이전 확정값 초기화
  useEffect(() => {
    if (step === 0) setConfirmed(null);
  }, [step]);

  // 현재 입력 수량을 1~보유수로 안전하게 보정
  const safeQty = useMemo(() => {
    const max = Math.max(1, viewRadishQty || 1);
    return clamp(Number(sellQty) || 1, 1, max);
  }, [sellQty, viewRadishQty]);

  // uiStep 변경은 내 턴에서만 허용
  const setStep = (next) => {
    if (!isMyTurn) return;
    onAction?.('SET_STEP', { uiStep: next });
  };

  // 판매 확정: 로컬 confirmed 저장 + 서버로 판매 액션 전송
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

  // 인트로 대사 하이라이트(플레이어 이름/가격)
  const highlightsStep0 = useMemo(() => {
    const hs = [];
    if (pName) hs.push({ text: pName, color: playerColor });
    if (priceText) hs.push({ text: priceText, color: COLORS.ac.nookCyan });
    return hs;
  }, [pName, playerColor, priceText]);

  const overlayDim = useMemo(() => withAlpha(COLORS.ac.black, 0.06), []);

  // tradeMemberId가 viewPlayer와 동일한 거래인지 판정(관전 동기화용)
  const isTradeForViewPlayer = useMemo(() => {
    const tId = Number(tradeMemberId);
    const vId = Number(viewPlayer?.memberId ?? viewPlayer?.id);
    if (!Number.isFinite(tId) || !Number.isFinite(vId)) return false;
    return tId === vId;
  }, [tradeMemberId, viewPlayer]);

  // 판매 수량: 서버 최상위(tradeQty) 우선, 없으면 player 내부 값, 최후에 로컬 confirmed
  const soldQty = useMemo(() => {
    const serverQtyRoot = Number(tradeQty);
    if (Number.isFinite(serverQtyRoot) && serverQtyRoot > 0) {
      if (isTradeForViewPlayer || (tradeMemberId == null && isMyTurn)) return serverQtyRoot;
    }

    const serverQtyInPlayer = Number(viewPlayer?.quantity ?? viewPlayer?.lastTradeQty);
    if (Number.isFinite(serverQtyInPlayer) && serverQtyInPlayer > 0) return serverQtyInPlayer;

    if (isMyTurn && confirmed?.qty != null) return Number(confirmed.qty) || 0;
    return 0;
  }, [tradeQty, tradeMemberId, isTradeForViewPlayer, isMyTurn, viewPlayer, confirmed]);

  // 판매 금액: 서버 최상위(tradeAmount) 우선, 없으면 player 내부 값, 최후에 로컬 confirmed
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
    // step 0: 인트로(클릭하면 step 1로)
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
            role={interactive ? 'button' : undefined}
            tabIndex={interactive ? 0 : -1}
            onClick={() => {
              if (!interactive) return;
              setStep(1);
            }}
            onKeyDown={(e) => {
              if (!interactive) return;
              if (e.key === 'Enter' || e.key === ' ') setStep(1);
            }}
            style={{
              // 관전자는 클릭 타겟 제거
              pointerEvents: interactive ? 'auto' : 'none',
              cursor: interactive ? 'pointer' : 'default',
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

    // step 1: 판매 수량 입력
    if (step === 1) {
      return (
        <RadishSellInput
          open
          price={priceNum}
          maxQty={Math.max(1, viewRadishQty || 1)}
          value={safeQty}
          ownedQty={viewRadishQty}
          onChange={(v) => setSellQty(v)}
          onConfirm={handleSell}
          canConfirm={canSell}
          confirmText="결정"
          maxButtonText="팔 수 있는 만큼"
          interactive={interactive}
        />
      );
    }

    // step 2: 판매 완료/결과 표시
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

          {/* step=2(완료 화면)에서는 ExitButton 숨김 */}
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
