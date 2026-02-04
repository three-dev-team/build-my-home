import { useEffect, useMemo, useState } from 'react';
import './css/Mupani.css';
import Subtitle from '../../components/common/Subtitle.jsx';
import AspectLayout from '../../components/layout/AspectLayout';
import NumberPad from '../../components/common/NumberPad.jsx';
import ExitButton from '../../components/common/ExitButton.jsx'
import BellPanel from '../../components/common/BellPanel.jsx'
import { COLORS } from '../../constants/colors.js';

const INTRO_BG = '/images/mupani/bg-mupanitile.jpg';

export default function Mupani({ gameState, myId, onBuy, onSkip }) {
  const status = gameState?.status;

  // step 0: 인트로 | 1: 구매 화면 (숫자 패드) | 2: 첫 번째 확인 ("이렇게 사실래?")
  // 3: 최종 완료 ("무야 무야 비~싸져라~") | 4: 스킵 화면 ("다음에 보자구~") | 5: 무 보유 중 메시지
  const [step, setStep] = useState(0);

  // 구매 수량 상태
  const [qty, setQty] = useState(1);

  // 서버 확정 기준 결정 완료 상태
  const [hasDecided, setHasDecided] = useState(false);

  // 현재 무 가격 숫자 변환
  const radishPrice = Number(gameState?.radishPrice ?? 0);

  const selfId = useMemo(() => Number(myId), [myId]);

  // players는 리스트 형태라서 내 플레이어 엔트리 검색 처리
  const myPlayer = useMemo(() => {
    const list = gameState?.players;
    if (!Array.isArray(list)) return null;
    return list.find((p) => Number(p?.memberId) === selfId) ?? null;
  }, [gameState?.players, selfId]);

  // 내 보유 벨 숫자 변환
  const myBell = Number(myPlayer?.bell ?? 0);

  // 내 보유 무 수량 숫자 변환
  const myRadishQty = Number(myPlayer?.radishQty ?? 0);

  // 무 보유 여부 확인
  const hasRadish = myRadishQty > 0;

  // 무파니 색상
  const mupani = COLORS.characters.mupani;

  // 현재 벨과 가격 기준 구매 가능한 최대 수량 계산
  const maxAffordableQty = useMemo(() => {
    if (status !== 'WAITING_MUPANI') return 1;
    if (radishPrice <= 0) return 1;
    return Math.max(1, Math.floor(myBell / radishPrice));
  }, [status, myBell, radishPrice]);

  // 최대 구매 가능 수량이 바뀌면 현재 qty 범위 보정 처리
  useEffect(() => {
    if (status !== 'WAITING_MUPANI') return;
    setQty((q) => Math.min(Math.max(1, q), maxAffordableQty));
  }, [status, maxAffordableQty]);

  // 현재 선택 수량 기준 총 가격 계산
  const totalCost = useMemo(() => {
    if (radishPrice <= 0) return 0;
    return radishPrice * qty;
  }, [radishPrice, qty]);

  // WAITING_MUPANI 진입 시 화면 초기화 처리
  useEffect(() => {
    if (status !== 'WAITING_MUPANI') return;
    setStep(0);
    setQty(1);
    setHasDecided(false);
  }, [status]);

  // 서버 응답 타입과 memberId 기준 내 결정 확정 처리
  // RADISH_BOUGHT면 step 3으로
  // RADISH_SKIPPED면 step 4로
  useEffect(() => {
    if (status !== 'WAITING_MUPANI') return;

    const t = gameState?.type;
    const mid = Number(gameState?.memberId);

    if (mid === selfId) {
      if (t === 'RADISH_BOUGHT') {
        setHasDecided(true);
        setStep(3);
        return;
      }
      if (t === 'RADISH_SKIPPED') {
        setHasDecided(true);
        setStep(4);
        return;
      }
    }
  }, [status, gameState?.type, gameState?.memberId, selfId]);

  // 무파니 상태가 아니면 렌더 생략 처리
  if (status !== 'WAITING_MUPANI') return null;

  // 인트로 화면 핸들러
  const handleBuy = () => {
    // 무 보유 여부 체크
    if (hasRadish) {
      setStep(5); // 무 보유 중 메시지로
    } else {
      setStep(1); // 구매 화면으로
    }
  };

  const handleSkip = () => {
    onSkip(); // 스킵 화면으로
  };

  // 구매 화면에서 결정 버튼
  const handleConfirmBuy = () => {
    if (totalCost > myBell) {
      return;
    }
    setStep(2); // 첫 번째 확인 화면으로
  };

  // 첫 번째 확인 화면에서 "사실게" 버튼
  const handleFinalConfirm = () => {
    onBuy(qty); // 서버에 구매 요청
  };

  // 뒤로 가기 (구매 화면 → 인트로)
  const handleBack = () => {
    setStep(0);
  };

  // 다시 정하기 (첫 번째 확인 화면 → 구매 화면)
  const handleReselect = () => {
    setStep(1);
  };

  // 스킵 확정 핸들러
  const handleConfirmSkip = () => {
    onSkip();
  };

  // 무 보유 중 메시지에서 나가기
  const handleAlreadyHasRadish = () => {
    onSkip(); // 또는 setStep(0)으로 인트로로 돌아가기
  };

  // ExitButton 핸들러 - step 4로 가고 자동 종료
  const handleExit = () => {
    setStep(4);
    // 짧은 딜레이 후 onSkip 호출하여 서버에 알림
    setTimeout(() => {
      if (!hasDecided) {
        onSkip();
      }
    }, 5000);
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
        <div className="mupani-container">
          {/* Step 0: 인트로 화면 */}
          {step === 0 && (
            <Subtitle
              nameText="무파니"
              nameColor={mupani.nameBox}
              nameTextColor={mupani.nameText}
              contentText={`어디 보자, 오늘은\n무 하나에 ${radishPrice}벨인데\n한번 사보실래?`}
              highlights={[{ text: `${radishPrice}`, color: COLORS.ac.ocean }]}
              options={[
                { text: '살래', onClick: handleBuy },
                { text: '안살래', onClick: handleSkip },
              ]}
            />
          )}
          {/* Step 1: 구매 화면 (숫자 패드) */}
          {step === 1 && (
            <div className="mupani-purchase-screen">
              {/* UI 배경 이미지 */}
              <div className="mupani-ui-background">
                <img src="/images/mupani/ui-mupani.webp" alt="무파니 UI" className="mupani-ui-image" />

                {/* 상단 정보 영역 */}
                <div className="mupani-header-question">
                  1무에 <span className="highlight-price"> {radishPrice}벨</span>인데 얼마나 사실래?
                </div>

                {/* 무 입력 표시 */}
                <div className="mupani-radish-display"> {qty}</div>

                {/* 총 가격 표시 */}
                <div className="mupani-total"> {totalCost.toLocaleString()}벨 </div>
              </div>

              {/* 숫자 패드 */}
              <NumberPad
                value={qty}
                onChange={setQty}
                max={maxAffordableQty}
                onConfirm={handleConfirmBuy}
                onBack={handleBack}
                maxButtonText="살 수 있는 만큼"
              />
              <BellPanel amount={myBell ?? 0} />
              <ExitButton onClick={handleExit} />
            </div>
          )}

          {/* Step 2: 첫 번째 확인 화면 (이렇게 사실래?) */}
          {step === 2 && (
            <Subtitle
              nameText="무파니"
              nameColor={mupani.nameBox}
              nameTextColor={mupani.nameText}
              contentText={`${qty}무라면...\n다 해서 ${totalCost.toLocaleString()}벨인데 이렇게 사실래?`}
              highlights={[{ text: `${totalCost.toLocaleString()}`, color: COLORS.ac.ocean }]}
              options={[
                { text: '사실게', onClick: handleFinalConfirm },
                { text: '다시정하실게', onClick: handleReselect },
              ]}
            />
          )}

          {/* Step 3: 최종 구매 완료 화면 */}
          {step === 3 && (
            <Subtitle
              nameText="무파니"
              nameColor={mupani.nameBox}
              nameTextColor={mupani.nameText}
              contentText={`무야 무야 비~싸져라~\n비싸지면 좋겠구만~\n무는 3턴이 지나면 썩으니 기억하라구...`}
              highlights={[{ text: '3턴', color: COLORS.ac.red }]}
            />
          )}

          {/* Step 4: 스킵 화면 (안살래 선택 시) */}
          {step === 4 && (
            <Subtitle
              nameText="무파니"
              nameColor={mupani.nameBox}
              nameTextColor={mupani.nameText}
              contentText={`무 장사 외길 인생을 걸은 지\n얼마 안 됐지만 아무튼...\n다음에 기회가 있으면 또 보자구~`}
            />
          )}

          {/* Step 5: 무 보유 중 메시지 (이미 무가 있을 때) */}
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
