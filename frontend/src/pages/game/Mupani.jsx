import { useEffect, useMemo, useState } from 'react';
import './css/Mupani.css';

const INTRO_IMG = '/images/mupani/MupaniIntro.webp';
const END_IMG = '/images/mupani/MupaniEnd.webp';

export default function Mupani({ gameState, myId, onBuy, onSkip }) {
  const status = gameState?.status;

  // 인트로 화면 표시 상태
  const [introVisible, setIntroVisible] = useState(true);

  // 구매 수량 상태
  const [qty, setQty] = useState(1);

  // 서버 확정 기준 구매 여부 상태
  const [hasBought, setHasBought] = useState(false);

  // 서버 확정 기준 결정 완료 상태
  const [hasDecided, setHasDecided] = useState(false);

  // 현재 무 가격 숫자 변환
  const radishPrice = Number(gameState?.radishPrice ?? 0);

  // players는 리스트 형태라서 내 플레이어 엔트리 검색 처리
  const myPlayer = useMemo(() => {
    const list = gameState?.players;
    if (!Array.isArray(list)) return null;
    return list.find((p) => Number(p?.memberId) === Number(myId)) ?? null;
  }, [gameState?.players, myId]);

  // 내 보유 벨 숫자 변환
  const myBell = Number(myPlayer?.bell ?? 0);

  // 내 보유 무 수량 숫자 변환
  const myRadishQty = Number(myPlayer?.radishQty ?? 0);

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

  // 구매 버튼 활성 조건 계산
  const canBuy = useMemo(() => {
    if (status !== 'WAITING_MUPANI') return false;
    if (hasDecided) return false;
    if (myRadishQty > 0) return false;
    if (radishPrice <= 0) return false;
    return myBell >= totalCost;
  }, [status, hasDecided, myRadishQty, myBell, radishPrice, totalCost]);

  // WAITING_MUPANI 진입 시 화면 초기화 처리
  // 인트로 노출 후 2초 뒤 구매 화면 전환 처리
  useEffect(() => {
    if (status !== 'WAITING_MUPANI') return;

    setIntroVisible(true);
    setHasBought(false);
    setHasDecided(false);
    setQty(1);

    const t = setTimeout(() => setIntroVisible(false), 2000);
    return () => clearTimeout(t);
  }, [status]);

  // 서버 응답 타입과 memberId 기준 내 결정 확정 처리
  // RADISH_BOUGHT면 엔딩 이미지 노출 처리
  // RADISH_SKIPPED면 버튼 잠금 처리
  // 무 보유자는 시작 시점부터 구매 불가라 버튼 잠금 처리
  useEffect(() => {
    if (status !== 'WAITING_MUPANI') return;

    const t = gameState?.type;
    const mid = Number(gameState?.memberId);

    if (t === 'RADISH_BOUGHT' && mid === Number(myId)) {
      setHasBought(true);
      setHasDecided(true);
      return;
    }

    if (t === 'RADISH_SKIPPED' && mid === Number(myId)) {
      setHasDecided(true);
      return;
    }

    if (myRadishQty > 0) {
      setHasDecided(true);
    }
  }, [status, gameState?.type, gameState?.memberId, myId, myRadishQty]);

  // 구매 클릭 핸들러 처리
  const handleBuyClick = () => {
    if (!canBuy) return;
    onBuy(qty);
  };

  // 스킵 클릭 핸들러 처리
  const handleSkipClick = () => {
    if (status !== 'WAITING_MUPANI') return;
    if (hasDecided) return;
    onSkip();
  };

  // 무파니 상태가 아니면 렌더 생략 처리
  if (status !== 'WAITING_MUPANI') return null;

  // 인트로 화면 렌더 처리
  if (introVisible) {
    return (
      <div className="mupaniFullScreen">
        <img className="mupaniFullImage" src={INTRO_IMG} alt="mupani-intro" />
      </div>
    );
  }

  // 구매 확정된 경우 엔딩 화면 렌더 처리
  if (hasBought) {
    return (
      <div className="mupaniFullScreen">
        <img className="mupaniFullImage" src={END_IMG} alt="mupani-end" />
      </div>
    );
  }

  // 구매 미확정 상태 구매 화면 렌더 처리
  // 스킵 확정 이후에도 화면은 유지하고 버튼만 잠금 처리
  return (
    <div className="mupaniFullScreen mupaniUi">
      <div className="mupaniTopBar">
        <div className="mupaniTopTitle">무파니 등장!</div>
        <div className="mupaniTopSub">구매 여부와 관계없이 20초 후 자동으로 종료돼.</div>
      </div>

      <div className="mupaniCenter">
        <div className="mupaniInfoCard">
          <div className="mupaniRow">
            <div className="mupaniLabel">현재 무 가격</div>
            <div className="mupaniValue">
              {radishPrice} 벨{myRadishQty > 0 && <span className="mupaniBadge">보유 {myRadishQty}개</span>}
            </div>
          </div>

          <div className="mupaniRow">
            <div className="mupaniLabel">내 벨</div>
            <div className="mupaniValue">{myBell} 벨</div>
          </div>

          <div className="mupaniDivider" />

          <div className="mupaniRow">
            <div className="mupaniLabel">구매 개수</div>
            <div className="mupaniValue">{qty} 개</div>
          </div>

          <div className="mupaniRow">
            <div className="mupaniLabel">총 가격</div>
            <div className="mupaniValue">{totalCost} 벨</div>
          </div>

          <div className="mupaniHint">
            {myRadishQty > 0
              ? '이미 무를 보유 중이라 이번에는 구매할 수 없어.'
              : '구매하면 다음 3라운드 동안 마을회관에서 팔 기회가 있어!'}
          </div>
        </div>
      </div>

      <div className="mupaniBottom">
        <div className="mupaniControls">
          <div className="mupaniQtyBox">
            <button className="mupaniQtyBtn" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={hasDecided}>
              -
            </button>

            <div className="mupaniQty">{qty}</div>

            <button
              className="mupaniQtyBtn"
              onClick={() => setQty((q) => Math.min(maxAffordableQty, q + 1))}
              disabled={hasDecided}
              title={qty >= maxAffordableQty ? '현재 벨로 살 수 있는 최대치야' : ''}
            >
              +
            </button>
          </div>

          <button
            className="mupaniBuyBtn"
            onClick={handleBuyClick}
            disabled={!canBuy}
            title={!canBuy ? '구매 조건이 안 맞아' : ''}
          >
            구매하기
          </button>

          <button className="mupaniSkipBtn" onClick={handleSkipClick} disabled={hasDecided}>
            {hasDecided ? '선택 완료' : '구매 안 함'}
          </button>
        </div>
      </div>
    </div>
  );
}
