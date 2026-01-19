// 테스트 위한 임시 컴포넌트
const DevControls = ({ onStatusChange }) => {
    // 개발 환경에서만 렌더링
    if (import.meta.env.PROD) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 bg-black/50 p-4 rounded-lg backdrop-blur-sm">
            <p className="text-white text-xs font-bold mb-1 text-center">
                DEV CONTROLS
            </p>
            <div className="grid grid-cols-2 gap-2">
                <button
                    onClick={() => onStatusChange("WAITING_LOAN")}
                    className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-xs rounded shadow"
                >
                    🏦 은행 (Loan)
                </button>
                <button
                    onClick={() => onStatusChange("WAITING_STAMP")}
                    className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded shadow"
                >
                    ✨ 스탬프 (Stamp)
                </button>
                <button
                    onClick={() => onStatusChange("WAITING_DICE")}
                    className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded shadow"
                >
                    🎲 주사위 굴리기 (RollDicePage)
                </button>
<<<<<<< HEAD
                <button
                    onClick={() => onStatusChange("WAITING_PLAYER_ACTION")}
                    className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded shadow"
                >
                    ⏎ 맵으로 돌아가기
                </button>
                <button onClick={() => onStatusChange("WAITING_SHOP_ITEM")}
                        className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white text-xs rounded shadow">
                    아이템 상점
                </button>
                <button onClick={() => onStatusChange("WAITING_SHOP_RESOURCE")}
                        className="px-3 py-1 bg-pink-500 hover:bg-pink-600 text-white text-xs rounded shadow">
                    재화 상점
                </button>
=======
>>>>>>> e23c125 (feat(BMH-132):일반 로그인 유저 소셜 로그인 연동 추가, github -> kakao로 변경)
            </div>
        </div>
    );
};

export default DevControls;