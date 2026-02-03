// BellPanel.jsx

/* ============================================
   [사용예시]
   <BellPanel amount={currentPlayer?.bell ?? 0} />

   [필수 조건]
   - AspectLayout 내부에서 사용
   - 부모에 position: relative 설정 (ShopPage.css .shop-page 참고 5번라인
============================================ */

import './BellPanel.css';
import { COLORS } from '../../constants/colors.js';

const BellPanel = ({ amount }) => {
  return (
    <div className="bell-panel-box">
      <img src="/images/common/ui-bell.webp" alt="벨" className="bell-panel" />
      <span className="bell-amount" style={{ color: COLORS.ac.creamWhite }}>
        {amount.toLocaleString()}
      </span>
    </div>
  );
};

export default BellPanel;
