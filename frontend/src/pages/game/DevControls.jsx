// 테스트 위한 임시 컴포넌트
const DevControls = ({ onStatusChange, onMockGameStart, setDevMyId, setGameState, roomId }) => {
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
            </div>
        </div>
    );
};

export default DevControls;