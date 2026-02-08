import { COLORS } from '../../constants/colors';

/**
 * 인증 페이지용 확인/선택 모달 (Login/Join 공통)
 * @param {boolean} isOpen - 모달 표시 여부
 * @param {string} title - 제목
 * @param {string} subtitle - 부제목
 * @param {Array} buttons - 버튼 배열 [{ label, onClick, primary }]
 */
export default function AuthConfirmModal({ isOpen, title, subtitle, buttons = [] }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className="relative w-[22cqw] rounded-[2.08cqw] shadow-2xl p-[2cqw] flex flex-col items-center animate-in zoom-in-95 duration-200"
        style={{ backgroundColor: COLORS.ac.creamWhite }}
      >
        <p
          className="font-bold text-center whitespace-pre-wrap mb-[0.6cqw] text-[1cqw]"
          style={{ color: COLORS.ac.darkBrown }}
        >
          {title}
        </p>
        {subtitle && (
          <p
            className="font-bold text-center whitespace-pre-wrap mb-[1.5cqw] text-[0.73cqw]"
            style={{ color: COLORS.text }}
          >
            {subtitle}
          </p>
        )}
        <div className="flex gap-[0.8cqw] w-full">
          {buttons.map((btn, idx) => (
            <button
              key={idx}
              onClick={btn.onClick}
              className="flex-1 py-[0.6cqw] rounded-[1.5cqw] font-black active:scale-95 transition-all text-[0.83cqw]"
              style={{
                backgroundColor: btn.primary ? COLORS.ac.coffeeBrown : '#D9D9D9',
                color: btn.primary ? COLORS.ac.creamIvory : COLORS.ac.darkBrown,
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
