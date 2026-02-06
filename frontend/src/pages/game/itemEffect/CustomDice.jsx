import { useState, useEffect, useCallback, useMemo } from 'react';
import InstructionText from '../../../components/common/InstructionText.jsx';
import Shadow from '../../../components/common/Shadow.jsx';
import { CHARACTERS } from '../../../constants/characters.js';
import '../css/RollDicePage.css';
import useSpaceKey from '../../../hooks/useSpaceKey.js';
import useArrowKey from '../../../hooks/useArrowKey.js';

const DICE_IMAGES = Array.from({ length: 6 }, (_, i) => `/images/dice/custom-dice-${i + 1}.webp`);

const CustomDice = ({ player, isMyTurn, onSelect }) => {
  const [selectedValue, setSelectedValue] = useState(1);
  const [confirmed, setConfirmed] = useState(false);

  const charImg = useMemo(() => {
    const map = CHARACTERS.reduce((acc, char) => {
      acc[Number(char.id)] = char.selectBasicImage;
      return acc;
    }, {});
    return player?.characterId ? map[player.characterId] : null;
  }, [player?.characterId]);

  // ←→ 방향키
  useArrowKey(
    () => setSelectedValue((prev) => (prev <= 1 ? 6 : prev - 1)),
    () => setSelectedValue((prev) => (prev >= 6 ? 1 : prev + 1)),
    { enabled: isMyTurn && !confirmed }
  );

  // 스페이스바 확정
  useSpaceKey(() => {
    if (confirmed) return;
    setConfirmed(true);
    onSelect(selectedValue); // 값 전달
  }, { enabled: isMyTurn && !confirmed });

  return (
    <div className="roll-dice-container">
      {/* 주사위 이미지 영역 */}
      <div className="dice-area">
        <div style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <img
            src={DICE_IMAGES[selectedValue - 1]}
            alt={`주사위 ${selectedValue}`}
            style={{ width: '80%', height: '80%', objectFit: 'contain' }}
          />
        </div>
      </div>

      {/* 캐릭터 영역 */}
      <div className="character-area">
        <Shadow fill={true}>
          <img src={charImg} alt={player?.nickname} className="current-character" />
        </Shadow>
      </div>

      <InstructionText>
        {isMyTurn
          ? '◀ ▶ 방향키로 숫자를 선택하고 스페이스바를 누르기'
          : `${player?.nickname}이(가) 주사위를 선택하고 있어요`}
      </InstructionText>
    </div>
  );
};

export default CustomDice;
