import React from 'react';

export default function LogoutModal({ onConfirm }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-6 z-[9999]">
      <div className="w-full max-w-[22cqw] rounded-[1.5cqw] p-[2cqw] bg-[#FFFCEF] border-[0.21cqw] border-[#8b5a2b] shadow-2xl flex flex-col items-center text-center">
        {/* Warning Icon */}
        <div className="w-[4.17cqw] h-[4.17cqw] rounded-full bg-[#FFF9E6] border-[0.21cqw] border-[#8b5a2b] flex items-center justify-center text-[2.5cqw] mb-[1.5cqh] shadow-sm">
          ⚠️
        </div>

        {/* Title */}
        <h2 className="text-[1.35cqw] font-black text-[#594E36] mb-[1cqh]">연결이 끊어졌어요!</h2>

        {/* Message */}
        <p className="text-[#594E36] font-medium text-[0.94cqw] leading-relaxed mb-[2cqh] break-keep">
          다른 기기에서 접속하여 로그아웃 되었습니다.
          <br />
          다시 로그인해 주세요.
        </p>

        {/* Confirm Button */}
        <button
          onClick={onConfirm}
          className="w-full py-[0.94cqw] rounded-[0.83cqw] font-bold text-white text-[1.04cqw] bg-[#594E36] hover:bg-[#6d5d43] shadow-md transition-colors active:translate-y-[0.1cqw]"
        >
          확인
        </button>
      </div>
    </div>
  );
}
