import React from 'react';
import './Machurilla.css';
import InstructionText from '../../../components/common/InstructionText.jsx';
import { iGa } from '../../../utils/josa.js';

const IMG = {
  clickSvg: '/images/board/icon-click.svg',
  clickWebp: '/images/board/icon-click.webp',
};

const CardSelectScreen = ({ isMyTurn, onSelect, player }) => {
  const name = String(player?.nickname ?? '').trim() || '플레이어';
  return (
    <div className="machurilla-bg machurilla-bg-card">
      <div className="machurilla-card-area">
        {[0, 1, 2, 3].map((id) => (
          <img
            key={id}
            src="/images/machurilla/card-machurilla-back.webp"
            alt="마추릴라 카드"
            className={`machurilla-card-back ${isMyTurn ? 'clickable' : 'disabled'}`}
            onClick={() => isMyTurn && onSelect()}
          />
        ))}
      </div>
      <InstructionText>
        {isMyTurn ? (
          <span className="instruction-inline">
            원하는 카드를 클릭하세요
            <img
              src={IMG.clickSvg}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = IMG.clickWebp;
              }}
              alt="click"
              draggable={false}
              className="instruction-click-icon"
            />
          </span>
        ) : (
          `${name}${iGa(name)} 카드를 고르고 있습니다`
        )}
      </InstructionText>
    </div>
  );
};

export default CardSelectScreen;
