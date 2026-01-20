// FixedPlayerButtons.jsx
const FixedPlayerButtons = ({ onATMClick, onBuildClick, isMyTurn }) => {
    return (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-3">
            <button
                onClick={onATMClick}
                disabled={!isMyTurn}
                className={`px-4 py-3 rounded-lg font-bold ${
                    isMyTurn
                        ? "bg-green-500 hover:bg-green-600 text-white"
                        : "bg-gray-400 cursor-not-allowed"
                }`}
            >
                🏧 ATM 대출
            </button>
            <button
                onClick={onBuildClick}
                disabled={!isMyTurn}
                className={`px-4 py-3 rounded-lg font-bold ${
                    isMyTurn
                        ? "bg-blue-500 hover:bg-blue-600 text-white"
                        : "bg-gray-400 cursor-not-allowed"
                }`}
            >
                🏠 집짓기
            </button>
        </div>
    );
};

export default FixedPlayerButtons;