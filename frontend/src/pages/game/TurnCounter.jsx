// TurnCounter.jsx
const TurnCounter = ({ currentRound, totalRounds }) => {
  return (
    <div className="fixed top-4 right-4 bg-white/90 px-4 py-2 rounded-full shadow-lg z-200">
      <span> 턴 </span>
      <span className="text-xl font-bold text-gray-800">
        {currentRound} / {totalRounds}
      </span>
    </div>
  );
};

export default TurnCounter;
