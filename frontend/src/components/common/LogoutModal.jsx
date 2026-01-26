import React from 'react';

export default function LogoutModal({ onConfirm }) {
  return (
    <div className="fixed inset-0 bg-black/35 flex items-center justify-center px-6 z-[9999]">
      <div
        className={[
          'w-full max-w-sm rounded-[32px] p-8',
          'bg-[#f7f0e4] border-[5px] border-[#d6b98a]',
          'shadow-[0_30px_80px_rgba(0,0,0,0.35)]',
          'flex flex-col items-center text-center',
        ].join(' ')}
      >
        <div className="w-16 h-16 rounded-full bg-[#efe2c8] border-[3px] border-[#e2cfae] flex items-center justify-center text-3xl mb-4 shadow-sm">
          ⚠️
        </div>

        <h2 className="text-xl font-black text-[#5b4636] mb-3">연결이 끊어졌어요!</h2>

        <p className="text-[#6a5342] font-bold leading-relaxed mb-8 break-keep">
          다른 기기에서 접속하여 로그아웃 되었습니다.
          <br />
          다시 로그인해 주세요.
        </p>

        <button
          onClick={onConfirm}
          className={[
            'w-full py-3.5 rounded-full font-black text-white text-lg',
            'bg-[#7bb46b] hover:bg-[#6aa65a] border-2 border-[#5a8f4e]',
            'shadow-[0_4px_0_#4a7f40] active:shadow-none active:translate-y-[2px] transition-all',
          ].join(' ')}
        >
          확인
        </button>
      </div>
    </div>
  );
}
