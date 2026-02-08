/**
 * 확인 모달 (alert/confirm 대체용)
 * confirmOnly=true 이면 '확인' 버튼만 표시
 */
export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmOnly }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
      <div className="bg-[#FDFBF6] rounded-[1.5cqw] p-[2cqw] w-[30cqw] text-center shadow-xl">
        {/* 제목 */}
        <h2 className="text-[1.4cqw] font-bold text-[#594E36] mb-[1cqh]">{title}</h2>

        {/* 메시지 */}
        <p className="text-[1cqw] text-[#7B6C53] mb-[2cqh] whitespace-pre-wrap">{message}</p>

        {/* 버튼들 */}
        <div className="flex gap-[1cqw]">
          {!confirmOnly && (
            <button
              onClick={onCancel}
              className="flex-1 bg-[#D9D9D9] text-[#594E36] py-[0.8cqh] rounded-[0.8cqw] text-[1cqw] font-bold hover:bg-[#C0C0C0] transition-colors"
            >
              취소
            </button>
          )}
          <button
            onClick={onConfirm}
            className={`flex-1 ${confirmOnly ? 'bg-[#594E36]' : 'bg-[#EB5757] hover:bg-[#D04545]'} text-white py-[0.8cqh] rounded-[0.8cqw] text-[1cqw] font-bold transition-colors`}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
