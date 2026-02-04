// SelectCategory.jsx
import { useMemo } from 'react';
import AspectLayout from '../../../components/layout/AspectLayout.jsx';
import InstructionText from '../../../components/common/InstructionText.jsx';
import { CHARACTERS } from '../../../constants/characters.js';
import './Swap.css';

const IMG = {
  clickSvg: '/images/board/icon-click.svg',
  clickWebp: '/images/board/icon-click.webp',
};

const CATEGORIES = ['HOUSE', 'BELL', 'RESOURCE', 'LOAN'];
const DIRECTIONS = ['TO_RIGHT', 'TO_LEFT', 'EXCHANGE'];

// 카테고리+방향 조합으로 이미지 경로 반환
const getCenterIcon = (category, direction) => {
  const cat = category.toLowerCase();
  const dir = direction === 'EXCHANGE' ? 'exchange' : direction === 'TO_RIGHT' ? 'to-right' : 'to-left';
  return `/images/swap/ui-swap-${cat}-${dir}.webp`;
};

export default function SelectCategory({ isMyTurn, player, players, onAction }) {
  // swapData에서 선택된 값 확인
  const swapData = useMemo(() => {
    try {
      return JSON.parse(player?.actionDataStr || '{}');
    } catch {
      return {};
    }
  }, [player?.actionDataStr]);

  // 선택된 플레이어 찾기
  const selectedPlayer1 = swapData.player1Id ? players.find((p) => p.memberId === swapData.player1Id) : null;
  const selectedPlayer2 = swapData.player2Id ? players.find((p) => p.memberId === swapData.player2Id) : null;

  const selectedChar1 = selectedPlayer1 ? CHARACTERS.find((c) => c.id === selectedPlayer1.characterId) : null;
  const selectedChar2 = selectedPlayer2 ? CHARACTERS.find((c) => c.id === selectedPlayer2.characterId) : null;

  // 선택된 카테고리/방향
  const selectedCategory = swapData.category || null;
  const selectedDirection = swapData.direction || null;

  // 랜덤 초기값 (시각적 표시용, 미선택 시)
  const randomPlayer1 = players[Math.floor(Math.random() * players.length)];
  const randomPlayer2 = players[Math.floor(Math.random() * players.length)];
  const randomCategory = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
  const randomDirection = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];

  // 캐릭터 정보 가져오기
  const getCharacter = (p) => {
    return CHARACTERS.find((c) => c.id === p?.characterId) || CHARACTERS[0];
  };

  const char1 = getCharacter(randomPlayer1);
  const char2 = getCharacter(randomPlayer2);

  const handleSelect = (nextStep) => {
    if (!isMyTurn) return;
    onAction('SET_STEP', { uiStep: nextStep });
  };

  return (
    <div className="swap-container swap-main">
      {/* 왼쪽 - 플레이어1 */}
      {selectedChar1 ? (
        <div className="swap-selected swap-selected-left">
          <img src={selectedChar1.rightImage} alt={selectedChar1.name} className="swap-selected-img" />
        </div>
      ) : (
        <div className={`swap-box swap-box-left ${isMyTurn ? 'clickable' : ''}`} onClick={() => handleSelect(2)}>
          <div className="swap-box-white-area">
            <div className="swap-box-icon-area">
              <img src={char1.roomListImage} alt={char1.name} className="swap-box-icon" />
            </div>
          </div>
          <img src="/images/swap/ui-swap-left.webp" alt="" className="swap-box-frame" />
        </div>
      )}

      {/* 가운데 - 재화/방향 */}
      {selectedCategory && selectedDirection ? (
        <div className="swap-selected swap-selected-center">
          <img src={getCenterIcon(selectedCategory, selectedDirection)} alt="" className="swap-selected-img" />
        </div>
      ) : (
        <div className={`swap-box swap-box-center ${isMyTurn ? 'clickable' : ''}`} onClick={() => handleSelect(4)}>
          <div className="swap-box-white-area">
            <div className="swap-box-icon-area">
              <img src={getCenterIcon(randomCategory, randomDirection)} alt="" className="swap-box-icon" />
            </div>
          </div>
          <img src="/images/swap/ui-swap-center.webp" alt="" className="swap-box-frame" />
        </div>
      )}

      {/* 오른쪽 - 플레이어2 */}
      {selectedChar2 ? (
        <div className="swap-selected swap-selected-right">
          <img src={selectedChar2.leftImage} alt={selectedChar2.name} className="swap-selected-img" />
        </div>
      ) : (
        <div className={`swap-box swap-box-right ${isMyTurn ? 'clickable' : ''}`} onClick={() => handleSelect(3)}>
          <div className="swap-box-white-area">
            <div className="swap-box-icon-area">
              <img src={char2.roomListImage} alt={char2.name} className="swap-box-icon" />
            </div>
          </div>
          <img src="/images/swap/ui-swap-right.webp" alt="" className="swap-box-frame" />
        </div>
      )}

      <InstructionText>
        {isMyTurn ? (
          <span className="swap-instruction-inline">
            원하는 옵션을 클릭하세요
            <img
              src={IMG.clickSvg}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = IMG.clickWebp;
              }}
              alt="click"
              draggable={false}
              className="swap-click-icon"
            />
          </span>
        ) : (
          `${player?.nickname || '플레이어'}가 선택 중입니다`
        )}
      </InstructionText>
    </div>
  );
}
