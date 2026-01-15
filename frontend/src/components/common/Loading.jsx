export default function Loading() {
    return (
        <div className="w-full h-screen flex items-center justify-center bg-[#fdf6e3]">
            <div className="flex flex-col items-center gap-4">
                {/* 애니메이션 효과로 처리 중임을 알림 */}
                <div className="text-3xl animate-bounce">🍃</div>
                <div className="text-2xl font-black text-[#8b5a2b]">
                    로딩 중입니다...
                </div>
            </div>
        </div>
    );
}