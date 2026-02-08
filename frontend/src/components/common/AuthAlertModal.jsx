import { COLORS } from '../../constants/colors';

/**
 * 인증 페이지용 알림 모달 (Login/Join 공통)
 * @param {boolean} isOpen - 모달 표시 여부
 * @param {string} message - 메시지 (줄바꿈: \n)
 * @param {boolean} showButton - 확인 버튼 표시 여부 (기본: true)
 * @param {function} onClose - 확인 버튼 클릭 핸들러
 */
export default function AuthAlertModal({ isOpen, message, showButton = true, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className="relative w-[18.23cqw] rounded-[2.08cqw] shadow-2xl p-[1.67cqw] flex flex-col items-center animate-in zoom-in-95 duration-200"
        style={{ backgroundColor: COLORS.ac.creamWhite }}
      >
        <p
          className="font-bold text-center whitespace-pre-wrap mb-[1.25cqw] text-[0.83cqw]"
          style={{ color: COLORS.text }}
        >
          {message}
        </p>
        {showButton && (
          <button
            onClick={onClose}
            className="px-[2.08cqw] py-[0.42cqw] rounded-full font-black active:scale-95 transition-all text-[1.04cqw]"
            style={{ backgroundColor: COLORS.ac.coffeeBrown, color: COLORS.ac.creamIvory }}
          >
            확인
          </button>
        )}
      </div>
    </div>
  );
}
