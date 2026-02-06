import { useEffect, useMemo, useState } from 'react';
import './css/Mupani.css';
import Subtitle from '../../components/common/Subtitle.jsx';
import AspectLayout from '../../components/layout/AspectLayout';
import NumberPad from '../../components/common/NumberPad.jsx';
import ExitButton from '../../components/common/ExitButton.jsx';
import BellPanel from '../../components/common/BellPanel.jsx';
import AutoMove from '../../components/common/AutoMove.jsx';
import { COLORS } from '../../constants/colors.js';
import { CHARACTERS } from '../../constants/characters.js';

// 무파니 칸 당사자(현재 턴 플레이어) 보너스 수량
const MUPANI_BONUS = 2;

export default function Mupani({ gameState, myId, onBuy, onSkip }) {
  const status = gameState?.status;

  // step 0: 인트로 | 1: 구매 화면 | 2: 첫 확인 | 3: 구매 완료 | 4: 스킵 | 5: 무 보유 중
  const [step, setStep] = useState(0);
  const [qty, setQty] = useState(1);
  const [hasDecided, setHasDecided] = useState(false);
  const [open, setOpen] = useState(false);
  const [showMovingNotice, setShowMovingNotice] = useState(false);
  const radishPrice = Number(gameState?.radishPrice ?? 0);
  const selfId = useMemo(() => Number(myId), [myId]);

  const isMupaniOwner = useMemo(() => {
    const cur = gameState?.currentPlayerId;
    if (cur == null) return false;
    return Number(cur) === selfId;
  }, [gameState?.currentPlayerId, selfId]);

  const myPlayer = useMemo(() => {
    const list = gameState?.players;
    if (!Array.isArray(list)) return null;
    return list.find((p) => Number(p?.memberId) === selfId) ?? null;
  }, [gameState?.players, selfId]);

  const myBell = Number(myPlayer?.bell ?? 0);
  const myRadishQty = Number(myPlayer?.radishQty ?? 0);
  const hasRadish = myRadishQty > 0;

  const mupani = COLORS.characters.mupani;

  const isWaiting = status === 'WAITING_MUPANI';

  const maxAffordableQty = useMemo(() => {
    if (!isWaiting) return 1;
    if (radishPrice <= 0) return 1;
    return Math.max(1, Math.floor(myBell / radishPrice));
  }, [isWaiting, myBell, radishPrice]);

  useEffect(() => {
    if (!isWaiting) return;
    setQty((q) => Math.min(Math.max(1, q), maxAffordableQty));
  }, [isWaiting, maxAffordableQty]);

  const totalCost = useMemo(() => {
    if (radishPrice <= 0) return 0;
    return radishPrice * qty;
  }, [radishPrice, qty]);

  // return null 전에 문자열/색상 계산(훅 순서 안전)
  const totalCostText = String(totalCost.toLocaleString());
  const ownerNickname = String(myPlayer?.nickname ?? '').trim();

  const ownerCharacterColor = useMemo(() => {
    const cid = Number(myPlayer?.characterId ?? myPlayer?.character?.id ?? myPlayer?.character ?? 0);
    const found = (CHARACTERS || []).find((c) => Number(c?.id) === cid);
    return found?.color || COLORS.ac.nookCyan;
  }, [myPlayer?.characterId, myPlayer?.character]);

  const closeNow = () => {
    setOpen(false);
  };

  // WAITING_MUPANI 진입하면 열고 초기화
  useEffect(() => {
    if (!isWaiting) return;

    setOpen(true);
    setStep(0);
    setQty(1);
    setHasDecided(false);
    setShowMovingNotice(false);
  }, [isWaiting]);

  // 서버 응답으로 내 결정 확정되면 step 3/4로 전환
  useEffect(() => {
    if (!open) return;

    const t = gameState?.type;
    const mid = Number(gameState?.memberId);
    if (mid !== selfId) return;

    if (t === 'RADISH_BOUGHT') {
      setHasDecided(true);
      setStep(3);
      setShowMovingNotice(false); // 타이핑 완료 전에는 숨김
      return;
    }

    if (t === 'RADISH_SKIPPED') {
      setHasDecided(true);
      setStep(4);
      setShowMovingNotice(false); // 타이핑 완료 전에는 숨김
      return;
    }
  }, [open, gameState?.type, gameState?.memberId, selfId]);

  // WAITING이 끝나면(= 서버가 턴 넘김) 그 순간 닫기
  useEffect(() => {
    if (!open) return;
    if (isWaiting) return;

    // 서버가 TURN_COMPLETED로 넘어간 순간 닫기
    closeNow();
  }, [open, isWaiting]);

  // 결과 대사 타이핑 완료 시: AutoMove 노출
  const handleResultTypingDone = () => {
    setShowMovingNotice(true);
  };

  if (!open) return null;

  const handleBuy = () => {
    if (hasRadish) setStep(5);
    else setStep(1);
  };

  // “안살래”를 누르면 step4 대사 보여주고 서버 스킵 호출
  const handleSkip = () => {
    setHasDecided(true);
    setStep(4);
    setShowMovingNotice(false);
    onSkip?.();
  };

  const handleConfirmBuy = () => {
    if (totalCost > myBell) return;
    setStep(2);
  };

  const handleFinalConfirm = () => {
    onBuy?.(qty);
  };

  const handleReselect = () => {
    setStep(1);
  };

  const handleAlreadyHasRadish = () => {
    setHasDecided(true);
    setStep(4);
    setShowMovingNotice(false);
    onSkip?.();
  };

  // ExitButton: 그냥 스킵 호출(지연 호출/중복 호출 방지)
  const handleExit = () => {
    if (hasDecided) return;
    setHasDecided(true);
    setStep(4);
    setShowMovingNotice(false);
    onSkip?.();
  };

  const showNotice = (step === 3 || step === 4) && showMovingNotice;
  const colorVars = {
    '--mupani-question-text': COLORS.text,
    '--mupani-highlight-price': COLORS.ac.nookCyan,
    '--mupani-total-price': COLORS.ac.nookCyan,
    '--mupani-radish-qty': COLORS.ac.white,
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        pointerEvents: 'auto',
      }}
    >
      <AspectLayout>
        {step === 1 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 50000,
              pointerEvents: 'none',
            }}
          >
            <div style={{ pointerEvents: 'auto' }}>
              <ExitButton onClick={handleExit} />
            </div>
          </div>
        )}

        <div className="mupani-container" style={colorVars}>
          {showNotice && <AutoMove />}

          {/* Step 0 */}
          {step === 0 && (
            <Subtitle
              nameText="무파니"
              nameColor={mupani.nameBox}
              nameTextColor={mupani.nameText}
              contentText={`어디 보자, 오늘은\n무 하나에 ${radishPrice}벨인데\n한번 사보실래?`}
              highlights={[{ text: `${radishPrice}`, color: COLORS.ac.nookCyan }]}
              options={[
                { text: '살래', onClick: handleBuy },
                { text: '안살래', onClick: handleSkip },
              ]}
            />
          )}

          {/* Step 1 */}
          {step === 1 && (
            <div className="mupani-purchase-screen">
              <div className="mupani-ui-background">
                <img src="/images/mupani/ui-mupani.webp" alt="무파니 UI" className="mupani-ui-image" />

                <div className="mupani-header-question">
                  1무에 <span className="highlight-price"> {radishPrice}벨</span>인데 얼마나 사실래?
                </div>

                <div className="mupani-radish-display"> {qty}</div>

                <div className="mupani-total">{totalCost.toLocaleString()}벨</div>
              </div>

              <NumberPad
                value={qty}
                onChange={setQty}
                max={maxAffordableQty}
                onConfirm={handleConfirmBuy}
                maxButtonText="살 수 있는 만큼"
                confirmText="결정"
              />

              <BellPanel amount={myBell ?? 0} />
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <Subtitle
              nameText="무파니"
              nameColor={mupani.nameBox}
              nameTextColor={mupani.nameText}
              contentText={`${qty}무라면...\n다 해서 ${totalCostText}벨인데 이렇게 사실래?${
                isMupaniOwner ? `\n할머니가 ${ownerNickname}은 덤으로 ${MUPANI_BONUS}무 더 챙겨주래` : ''
              }`}
              highlights={[
                { text: `${qty}`, color: COLORS.ac.green },
                { text: totalCostText, color: COLORS.ac.nookCyan },
                ...(isMupaniOwner && ownerNickname ? [{ text: ownerNickname, color: ownerCharacterColor }] : []),
                ...(isMupaniOwner ? [{ text: `${MUPANI_BONUS}`, color: COLORS.ac.nookCyan }] : []),
              ]}
              options={[
                { text: '사실게', onClick: handleFinalConfirm },
                { text: '다시정하실게', onClick: handleReselect },
              ]}
            />
          )}

          {/* Step 3 */}
          {step === 3 && (
            <Subtitle
              nameText="무파니"
              nameColor={mupani.nameBox}
              nameTextColor={mupani.nameText}
              contentText={`무야 무야 비~싸져라~\n비싸지면 좋겠구만~\n무는 3턴이 지나면 썩으니 기억하라구...`}
              highlights={[{ text: '3턴', color: COLORS.ac.red }]}
              onTypingComplete={handleResultTypingDone}
            />
          )}

          {/* Step 4 */}
          {step === 4 && (
            <Subtitle
              nameText="무파니"
              nameColor={mupani.nameBox}
              nameTextColor={mupani.nameText}
              contentText={`무 장사 외길 인생을 걸은 지\n얼마 안 됐지만 아무튼...\n다음에 기회가 있으면 또 보자구~`}
              onTypingComplete={handleResultTypingDone}
            />
          )}

          {/* Step 5 */}
          {step === 5 && (
            <Subtitle
              nameText="무파니"
              nameColor={mupani.nameBox}
              nameTextColor={mupani.nameText}
              contentText={`아이고~ 이미 무를 ${myRadishQty}개나 들고 계시네!\n무는 한 번에 하나씩만 살 수 있다구...\n쪽박치기 전에 먼저 팔고 오셔~`}
              highlights={[{ text: `${myRadishQty}`, color: COLORS.ac.nookMint }]}
              options={[{ text: '알겠어', onClick: handleAlreadyHasRadish }]}
            />
          )}
        </div>
      </AspectLayout>
    </div>
  );
}
