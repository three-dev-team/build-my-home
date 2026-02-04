// EntryScreen.jsx
import Subtitle from '../../../components/common/Subtitle.jsx';
import { COLORS } from '../../../constants/colors.js';
import './Swap.css';

export default function EntryScreen({ isMyTurn, onAction }) {
  const handleNext = () => {
    if (!isMyTurn) return;
    onAction('SET_STEP', { uiStep: 1 });
  };

  return (
    <div className="swap-container swap-entry">
      <Subtitle
        nameText="몽셰르"
        nameColor={COLORS.characters.mongsher.nameBox}
        nameTextColor={COLORS.characters.mongsher.nameText}
        contentText={`꿈의 세계에 오신 것을 환영합니다!\n이곳에서는 무슨 일이든 일어날 수 있죠...`}
        showTriangle={isMyTurn}
        clickTriangle={handleNext}
      />
    </div>
  );
}
