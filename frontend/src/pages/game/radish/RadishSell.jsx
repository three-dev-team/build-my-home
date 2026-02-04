import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';

import AspectLayout from '../../../components/layout/AspectLayout.jsx';
import ExitButton from '../../../components/common/ExitButton.jsx';
import Subtitle from '../../../components/common/Subtitle.jsx';

import RadishSellComplete from './RadishSellComplete.jsx';

import { COLORS, withAlpha } from '../../../constants/colors.js';
import { CHARACTERS } from '../../../constants/characters.js';

const px = (n) => `calc(${n} * var(--s))`;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

const getPlayerName = (player, currentPlayerName) => {
  const n =
    currentPlayerName ??
    player?.nickname ??
    player?.name ??
    player?.playerName ??
    player?.memberName ??
    '';
  return String(n || '').trim();
};

const getPlayerCharacter = (player) => {
  const id = Number(player?.characterId ?? player?.character?.id ?? player?.character ?? 0);
  if (!id) return null;
  return (CHARACTERS || []).find((c) => Number(c?.id) === id) || null;
};

// CHARACTERS에는 key가 없어서 이미지 경로에서 key를 역추출
const extractKeyFromCharacter = (ch) => {
  const cand =
    ch?.selectBasicImage ||
    ch?.seatImage ||
    ch?.backImage ||
    ch?.deliveryImage ||
    ch?.houseImage ||
    '';
  const s = String(cand || '');
  const m = s.match(/char-([a-z0-9_-]+)-(?:idle|seat|sleep|back|delivery|house|seat-backward)\.webp/i);
  return m?.[1] || '';
};

// ✅ stamp 경로 (존재 안 하면 fallback 사용)
const getStampSrcByCharacter = (ch) => {
  const key = extractKeyFromCharacter(ch);
  if (!key) return '';
  return `/images/board/stamp-${key}.webp`;
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

  useEffect(() => {
    const max = Math.max(1, radishQty || 1);
    setSellQty((q) => clamp(Number(q) || 1, 1, max));
  }, [radishQty]);

  const safeQty = useMemo(() => {
    const max = Math.max(1, radishQty || 1);
    return clamp(Number(sellQty) || 1, 1, max);
  }, [sellQty, radishQty]);

  const priceNum = useMemo(() => Number(radishPrice || 0), [radishPrice]);
  const priceText = useMemo(() => priceNum.toLocaleString(), [priceNum]);
  const expectedAmount = useMemo(() => safeQty * priceNum, [safeQty, priceNum]);

  const setStep = (next) => {
    if (!isMyTurn) return;
    onAction?.('SET_STEP', { uiStep: next });
  };

  const handleSell = () => {
    if (!canSell) return;
    onAction?.('RADISH_SELL', { quantity: safeQty });
  };

  const soldQty = Number(player?.quantity ?? player?.lastTradeQty ?? safeQty);
  const soldAmount = Number(player?.amount ?? player?.lastTradeAmount ?? expectedAmount);

  // ===== 캐릭터 / 색상 =====
  const pName = useMemo(() => getPlayerName(player, currentPlayerName), [player, currentPlayerName]);
  const pChar = useMemo(() => getPlayerCharacter(player), [player]);

  const playerColor = useMemo(() => {
    const c = String(pChar?.color || '').trim();
    return c || COLORS.ac.nookCyan;
  }, [pChar]);

  // ===== 콩돌이 색 =====
  const naugulNameBox = COLORS?.characters?.naugul?.nameBox ?? COLORS.ac.nookCyan;
  const naugulNameText = COLORS?.characters?.naugul?.nameText ?? COLORS.ac.darkBrown;

  // ===== 배경 =====
  const BG = '/images/board/bg-mupanisell.webp';

  // ===== 오른쪽 캐릭터 이미지: stamp -> 실패 시 캐릭터 이미지 fallback =====
  const stampCandidate = useMemo(() => getStampSrcByCharacter(pChar), [pChar]);
  const fallbackCharacterImg = useMemo(() => {
    // stamp가 없거나 깨지면 최소한 캐릭터가 보이도록
    return (
      pChar?.houseImage ||
      pChar?.backImage ||
      pChar?.seatbackImage ||
      pChar?.seatImage ||
      pChar?.selectBasicImage ||
      ''
    );
  }, [pChar]);

  const [rightImgSrc, setRightImgSrc] = useState('');
  useEffect(() => {
    // step이 바뀌어도 캐릭터는 계속 보여야 해서 src만 동기화
    const next = stampCandidate || fallbackCharacterImg || '';
    setRightImgSrc(next);
  }, [stampCandidate, fallbackCharacterImg]);

  // ====== 하이라이트(step0) ======
  const highlightsStep0 = useMemo(() => {
    const hs = [];
    if (pName) hs.push({ text: pName, color: playerColor });
    if (priceText) hs.push({ text: priceText, color: COLORS.ac.nookCyan });
    return hs;
  }, [pName, playerColor, priceText]);

  // ====== 색 토큰 ======
  const overlayDim = useMemo(() => withAlpha(COLORS.ac.black, 0.06), []);
  const modalBg = useMemo(() => COLORS.ac.creamIvory, []);
  const btnBg = useMemo(() => COLORS.ac.creamWhite, []);
  const textMain = useMemo(() => COLORS.ac.darkBrown, []);
  const highlight = useMemo(() => COLORS.ac.nookCyan, []);
  const borderColor = useMemo(() => COLORS.ac.darkBrown, []);

  const renderContent = () => {
    // step 0: 시세 안내 (✅ 옵션칸 제거)
    if (step === 0) {
      const hello = pName ? `${pName} 님` : '손님';
      return (
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
          // ✅ options/optionColor/optionTextColor/optionDisabled를 아예 전달하지 않음(옵션칸 제거)
        />
      );
    }

    // step 1: (기존 임시 UI 유지)
    if (step === 1) {
      const title = pName ? `${pName}의 무 판매` : '무 판매';
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
              background: modalBg,
              padding: px(34),
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div style={{ fontSize: px(34), fontWeight: 900, color: textMain }}>{title}</div>

              <div style={{ fontSize: px(26), fontWeight: 900, color: textMain }}>
                현재 시세:{' '}
                <span style={{ color: highlight }}>{priceText}</span>
                벨
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
                color: textMain,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>보유 무</span>
                <span>{radishQty.toLocaleString()}개</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>예상 판매액</span>
                <span>
                  <span style={{ color: highlight }}>{expectedAmount.toLocaleString()}</span>벨
                </span>
              </div>
            </div>

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
                  background: btnBg,
                  color: textMain,
                  border: `solid ${px(4)} ${borderColor}`,
                  fontSize: px(42),
                  fontWeight: 900,
                  opacity: canSell ? 1 : 0.5,
                  cursor: canSell ? 'pointer' : 'not-allowed',
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
                  color: textMain,
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
                  background: btnBg,
                  color: textMain,
                  border: `solid ${px(4)} ${borderColor}`,
                  fontSize: px(42),
                  fontWeight: 900,
                  opacity: canSell ? 1 : 0.5,
                  cursor: canSell ? 'pointer' : 'not-allowed',
                }}
              >
                +
              </button>
            </div>
          </div>

          <Subtitle
            nameText="콩돌이"
            nameColor={naugulNameBox}
            nameTextColor={naugulNameText}
            contentText={
              !isMyTurn
                ? '지금은 네 차례가 아니라서 판매할 수 없다구리.'
                : radishQty <= 0
                  ? '보유한 무가 없어서 판매할 수 없다구리.'
                  : '수량을 고르고 판매하기를 누르면 된다구리!'
            }
            contentColor={COLORS.subtitle.contentBox}
            contentTextColor={COLORS.subtitle.contentText}
            options={[
              { text: '판매하기', onClick: handleSell },
              { text: '이전', onClick: () => setStep(0) },
            ]}
            optionColor={COLORS.subtitle.optionBox}
            optionTextColor={COLORS.subtitle.optionText}
            optionDisabled={!canSell}
            showTriangle
          />
        </>
      );
    }

    // step 2: 완료
    return (
      <RadishSellComplete
        open
        nameText="곰돌"
        nameColor={naugulNameBox}
        nameTextColor={naugulNameText}
        soldQty={soldQty}
        soldAmount={soldAmount}
        autoExitMs={3000}
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
            containerType: 'size',
            ['--s']: 'calc(100cqw / 1920)',
          }}
        >
          {/* 배경 */}
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

          {/* ✅ 오른쪽 캐릭터 박스(스펙 유지) + zIndex 올림 */}
          {rightImgSrc ? (
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                width: px(360),
                height: px(600),
                right: px(628),
                bottom: px(268),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
                zIndex: 25000, // ✅ Subtitle 위로
              }}
            >
              <img
                src={rightImgSrc}
                alt=""
                draggable={false}
                onError={() => {
                  // stamp가 깨지면 캐릭터 이미지로 fallback
                  if (rightImgSrc !== fallbackCharacterImg && fallbackCharacterImg) {
                    setRightImgSrc(fallbackCharacterImg);
                  }
                }}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  objectPosition: 'center',
                }}
              />
            </div>
          ) : null}

          {/* 메인 UI */}
          {renderContent()}

          {/* 나가기 버튼: step2만 숨김 */}
          {step !== 2 ? <ExitButton onClick={onClose} label="나가기" disabled={false} /> : null}

          {/* ✅ InstructionText는 요구대로 완전 제거 */}
        </div>
      </AspectLayout>
    </motion.div>
  );
}
