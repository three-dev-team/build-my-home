/**
 * 범용 알림 모달 (alert 대체용 - 확인 버튼만)
 * @param {boolean} isOpen - 모달 표시 여부
 * @param {string} icon - 이모지 아이콘 (예: '⚠️', '⏰')
 * @param {string} title - 제목
 * @param {string|React.ReactNode} message - 메시지 (JSX 가능)
 * @param {string} confirmText - 확인 버튼 텍스트 (기본: '확인')
 * @param {function} onConfirm - 확인 클릭 핸들러
 */
export default function AlertModal({ isOpen, icon, title, message, confirmText = '확인', onConfirm }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
      <div className="bg-[#FDFBF6] rounded-[1.5cqw] p-[2cqw] w-[30cqw] text-center shadow-xl">
        {/* 아이콘 */}
        {icon && <div className="text-[4cqw] mb-[1cqh]">{icon}</div>}

        {/* 제목 */}
        <h2 className="text-[1.4cqw] font-bold text-[#594E36] mb-[1cqh]">{title}</h2>

        {/* 메시지 */}
        <div className="text-[1cqw] text-[#7B6C53] mb-[2cqh] leading-relaxed">{message}</div>

        {/* 확인 버튼 */}
        <button
          onClick={onConfirm}
          className="w-full bg-[#594E36] text-white py-[0.8cqh] rounded-[0.8cqw] text-[1cqw] font-bold hover:bg-[#6d5d43] transition-colors"
        >
          {confirmText}
        </button>
      </div>
    </div>
  );
}
