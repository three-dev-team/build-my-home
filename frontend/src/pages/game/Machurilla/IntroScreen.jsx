const IntroScreen = ({ onSelect, isMyTurn, currentPlayerName }) => {
  return (
    <div className="bg-purple-800 rounded-3xl p-12 max-w-xl text-center shadow-2xl border-4 border-yellow-400">
      <h2 className="text-4xl font-bold mb-8 text-yellow-300">🔮 마추릴라</h2>

      <div className="text-xl text-white leading-relaxed space-y-4">
        <p>"케케라 랏초, 케케라 랏초..."</p>
        <p>"흐음! {currentPlayerName}... 당신의 운명이 보입니다... 보입니다아..."</p>
        <p>"자, 당신의 앞날에 빛이 비칠지, 아니면 먹구름이 낄지..."</p>
        <p>"제가 한 번 들여다보겠습니다. 준비되셨나요?"</p>
      </div>

      <button
        onClick={onSelect}
        disabled={!isMyTurn}
        className="mt-8 px-8 py-4 bg-yellow-400 text-purple-900 rounded-full text-2xl font-bold hover:bg-yellow-300 disabled:opacity-50"
      >
        운명을 점쳐보기
      </button>
    </div>
  );
};

export default IntroScreen;
