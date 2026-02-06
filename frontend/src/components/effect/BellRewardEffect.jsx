// import { useState, useEffect } from 'react';
// import './BellRewardEffect.css';
//
// /**
//  * 벨 획득 연출 컴포넌트
//  * 1단계: 코인이 위에서 떨어짐
//  * 2단계: 머리 위 glow 빛남
//  * 3단계: 코인 아이콘 + 금액 표시
//  *
//  * @param {number} amount - 획득 벨 금액
//  * @param {boolean} show - 연출 시작 여부
//  * @param {function} onComplete - 연출 완료 콜백
//  * @param {number} targetY - 캐릭터 머리 위치 (글로우 위치 조정용)
//  *
//  */
//
// const COIN_COUNT = 20; // 떨어지는 벨 개수
//
// const BellRewardEffect = ({ amount, show, targetY, onComplete }) => {
//   const [step, setStep] = useState(0);
//
//   useEffect(() => {
//     if (!show) return;
//
//     setStep(1); // 코인 떨어짐 시작 (0.8초 애니메이션 + 0.06*12 딜레이 ≈ 1.5초)
//
//     const flashTimer = setTimeout(() => setStep(2), 600);   // 코인 도착 즈음에 플래시
//     const resultTimer = setTimeout(() => setStep(3), 1000);  // 플래시 후 결과
//     const doneTimer = setTimeout(() => onComplete?.(), 1500); // 완료
//
//     return () => {
//       clearTimeout(flashTimer);
//       clearTimeout(resultTimer);
//       clearTimeout(doneTimer);
//     };
//   }, [show]);
//
//   if (!show && step === 0) return null;
//
//   const COINS = Array.from({ length: COIN_COUNT }, (_, i) => ({
//     delay: i * 0.05,
//     duration: 0.6 + Math.random() * 0.1,  // 0.6~0.9초 랜덤
//   }));
//
//
//   return (
//     <div className="bell-reward-overlay" style={{ '--target-y': `${targetY}cqh` }}>
//       {/* 1단계: 코인 여러 개 우수수 떨어짐 */}
//       {step >= 1 && (
//         <div className="bell-coin-shower">
//           {COINS.map((coin, i) => (
//             <img
//               key={i}
//               src="/images/common/ui-coin.webp"
//               alt="coin"
//               className={`bell-coin-drop ${step >= 2 ? 'landed' : ''}`}
//               style={{
//                 animationDelay: `${coin.delay}s`,
//                 animationDuration: `${coin.duration}s`,
//                 left: `calc(50% + ${coin.offsetX}cqw)`,
//                 width: `${coin.size}cqw`,
//                 zIndex: COIN_COUNT - i,
//               }}
//             />
//           ))}
//         </div>
//       )}
//
//       {/* 2단계: glow 이펙트 */}
//       {step >= 2 && <div className="bell-glow" />}
//
//       {/* 3단계: 결과 표시 */}
//       {step >= 3 && (
//         <div className="bell-result">
//           <img src="/images/common/icon-coin.svg" alt="bell" className="bell-result-icon" />
//           <img src="/images/common/icon-x.svg" alt="bell" className="bell-result-x" />
//           <span className="bell-result-amount">{amount}</span>
//         </div>
//       )}
//     </div>
//   );
// };
//
// export default BellRewardEffect;

import { useState, useEffect } from 'react';
import './BellRewardEffect.css';

/**
 * 벨 획득 연출 컴포넌트
 * 1단계: 코인이 위에서 끊임없이 떨어짐 + 도착 시 개별 glow
 * 2단계: 결과 표시 (코인 아이콘 + 금액)
 *
 * @param {number} amount - 획득 벨 금액
 * @param {boolean} show - 연출 시작 여부
 * @param {function} onComplete - 연출 완료 콜백
 * @param {number} targetY - 캐릭터 머리 위치 (cqh 단위)
 */
const BellRewardEffect = ({ amount, show, targetY, onComplete }) => {
  const [step, setStep] = useState(0);
  const [coins, setCoins] = useState([]);

  // 코인 생성 (step 1일 때 50ms마다)
  useEffect(() => {
    if (step !== 1) return;

    const interval = setInterval(() => {
      setCoins((prev) => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          offsetX: 0,
          size: 8,
          duration: 0.3,
          glowSize: 8 + Math.random() * 12, // 8~20cqw 랜덤
        },
      ]);
    }, 50);

    // 1.5초 후 코인 생성 중지
    const stopTimer = setTimeout(() => {
      clearInterval(interval);
      setStep(2);
    }, 800);

    return () => {
      clearInterval(interval);
      clearTimeout(stopTimer);
    };
  }, [step]);

  // 전체 타이밍
  useEffect(() => {
    if (!show) return;

    setStep(1);

    const resultTimer = setTimeout(() => setStep(3), 1100);
    const doneTimer = setTimeout(() => onComplete?.(), 1400);

    return () => {
      clearTimeout(resultTimer);
      clearTimeout(doneTimer);
    };
  }, [show]);

  if (!show && step === 0) return null;

  return (
    <div className="bell-reward-overlay" style={{ '--target-y': `${targetY}cqh` }}>
      {/* 1단계: 코인 끊임없이 떨어짐 + 개별 glow */}
      {step >= 1 && (
        <div className="bell-coin-shower">
          {coins.map((coin) => (
            <div
              key={coin.id}
              className="bell-coin-wrapper"
              style={{ left: `calc(50% + ${coin.offsetX}cqw)` }}
            >
              <img
                src="/images/common/ui-coin.webp"
                alt="coin"
                className="bell-coin-drop"
                style={{
                  animationDuration: `${coin.duration}s`,
                  width: `${coin.size}cqw`,
                }}
              />
              <div
                className="bell-coin-glow"
                style={{
                  animationDelay: `${coin.duration}s`,
                  width: `${coin.glowSize}cqw`,
                  height: `${coin.glowSize}cqw`,
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* 2단계: 결과 표시 */}
      {step >= 3 && (
        <div className="bell-result">
          <img src="/images/common/icon-coin.svg" alt="bell" className="bell-result-icon" />
          <img src="/images/common/icon-x.svg" alt="x" className="bell-result-x" />
          <span className="bell-result-amount">{amount}</span>
        </div>
      )}
    </div>
  );
};

export default BellRewardEffect;
