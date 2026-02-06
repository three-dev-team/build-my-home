import { useState, useEffect } from 'react';

/**
 * 브라우저 배율 경고 모달
 */
export default function ZoomWarningModal({ onDismiss }) {
  const [isZoom100, setIsZoom100] = useState(window.devicePixelRatio === 1);

  useEffect(() => {
    const checkZoom = () => {
      setIsZoom100(window.devicePixelRatio === 1);
    };

    window.addEventListener('resize', checkZoom);

    // 짧은 간격으로 체크 (Ctrl+0 즉시 반영)
    const interval = setInterval(checkZoom, 200);

    return () => {
      window.removeEventListener('resize', checkZoom);
      clearInterval(interval);
    };
  }, []);

  const handleDismiss = () => {
    if (isZoom100) {
      onDismiss();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
      <div className="bg-[#FDFBF6] rounded-[1.5cqw] p-[2cqw] w-[35cqw] text-center shadow-xl">
        {/* 아이콘 */}
        <div className="text-[4cqw] mb-[1cqh]">🔍</div>

        {/* 제목 */}
        <h2 className="text-[1.6cqw] font-bold text-[#5d4037] mb-[1cqh]">화면 배율 조정이 필요해요!</h2>

        {/* 메시지 */}
        <p className="text-[1.2cqw] text-[#7B6C53] mb-[1.5cqh]">
          브라우저 배율이 100%가 아닙니다.
          <br />
          <span className="font-bold">Ctrl + 0</span>을 눌러 배율을 초기화해주세요.
        </p>

        {/* 버튼 */}
        <button
          onClick={handleDismiss}
          disabled={!isZoom100}
          className={`w-full py-[0.8cqh] rounded-[0.8cqw] text-[1.2cqw] font-bold transition-colors ${
            isZoom100
              ? 'bg-[#594E36] text-white hover:bg-[#6d5d43] cursor-pointer'
              : 'bg-gray-400 text-gray-200 cursor-not-allowed'
          }`}
        >
          {isZoom100 ? '알겠어요' : '배율을 100%로 조정해주세요'}
        </button>
      </div>
    </div>
  );
}
