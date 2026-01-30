import { useEffect, useMemo, useState } from 'react';
import './css/PlayerActionPanel.css';

const BASE = { board: '/images/board' };
const IMG = {
  lte: `${BASE.board}/ui-remote-lte.svg`,
  btn: (key) => `${BASE.board}/btn-remote-${key}.webp`,
};

const toAmPm = (d) => {
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const isPm = h >= 12;
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${isPm ? 'PM' : 'AM'} ${String(hh).padStart(2, '0')}:${m}`;
};

const splitParenTwoLines = (s) => {
  if (!s) return ['', ''];
  const str = String(s).trim();
  const open = str.indexOf('(');
  const close = str.lastIndexOf(')');
  if (open !== -1 && close !== -1 && close > open) {
    return [str.slice(0, open).trim(), str.slice(open, close + 1).trim()];
  }
  return [str, ''];
};

export default function PlayerActionPanel({
                                            onSelectDice,
                                            onSelectItem,
                                            onBuildHouse,
                                            onATM,
                                            onInventory,
                                            onMupani,
                                            items,
                                            isMyTurn,
                                            itemUsed,
                                          }) {
  if (!isMyTurn) return null;

  const [timeText, setTimeText] = useState(() => toAmPm(new Date()));
  const [activeKey, setActiveKey] = useState(null);

  useEffect(() => {
    const id = setInterval(() => setTimeText(toAmPm(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  const hasItem = useMemo(() => Array.isArray(items) && items.length > 0, [items]);

  // 버튼 정의를 "필수 정보만" 남기기
  const BTN = useMemo(
    () => ({
      dice: {
        title: '주사위',
        desc: '주사위를 굴릴 수 있어 (보드판 이동)',
        onClick: onSelectDice,
        disabled: false,
      },
      naugul: {
        title: '마을회관',
        desc: '집을 업그레이드 할 수 있어 (재화, 벨 보유시)',
        onClick: onBuildHouse,
        disabled: !!itemUsed,
      },
      item: {
        title: '아이템',
        desc: '아이템을 사용할 수 있어 (아이템 소유시)',
        onClick: onSelectItem,
        disabled: !hasItem || !!itemUsed,
      },
      inventory: {
        title: '인벤토리',
        desc: '소지품을 확인할 수 있어 (재화, 과일)',
        onClick: onInventory,
        disabled: !!itemUsed,
      },
      atm: {
        title: 'ATM',
        desc: '대출을 받을 수 있어 (수수료 10%)',
        onClick: onATM,
        disabled: !!itemUsed,
      },
      mupani: {
        title: '무파니',
        desc: '무를 팔 수 있어 (현재 시세 반영)',
        onClick: onMupani,
        disabled: !!itemUsed || typeof onMupani !== 'function',
      },
    }),
    [onSelectDice, onBuildHouse, onSelectItem, onInventory, onATM, onMupani, hasItem, itemUsed]
  );

  // 화면에 그릴 순서만 배열로
  const order = ['dice', 'naugul', 'item', 'inventory', 'atm', 'mupani'];

  const activeBtn = activeKey ? BTN[activeKey] : null;
  const titleText = activeBtn?.title ?? '행동 선택';

  const descLines = useMemo(() => {
    const base = ['원하는 버튼을 눌러서', '진행해줘'];
    if (!activeBtn?.desc) return base;
    const [l1, l2] = splitParenTwoLines(activeBtn.desc);
    return [l1, l2 || ''];
  }, [activeBtn]);

  const handleClick = (key) => {
    const b = BTN[key];
    if (!b || b.disabled) return;
    if (typeof b.onClick === 'function') b.onClick();
  };

  return (
    <aside className="player-action-panel" aria-label="행동 선택">
      <div className="paa-time">
        <img className="paa-lte" src={IMG.lte} alt="lte" draggable={false} />
        <span className="paa-time-text">{timeText}</span>
      </div>

      <h2 className="paa-title">{titleText}</h2>

      <p className="paa-desc" aria-label="설명">
        <span className="paa-desc-line">{descLines[0]}</span>
        <br />
        <span className="paa-desc-line">{descLines[1]}</span>
      </p>

      <div className="paa-grid" role="group" aria-label="행동 버튼">
        {order.map((key) => {
          const b = BTN[key];
          return (
            <button
              key={key}
              type="button"
              className={`paa-btn ${b.disabled ? 'is-disabled' : ''}`}
              aria-disabled={b.disabled ? 'true' : 'false'}
              onClick={() => handleClick(key)}
              onMouseEnter={() => setActiveKey(key)}
              onMouseLeave={() => setActiveKey(null)}
              onFocus={() => setActiveKey(key)}
              onBlur={() => setActiveKey(null)}
            >
              <img className="paa-btn-img" src={IMG.btn(key)} alt={b.title} draggable={false} />
            </button>
          );
        })}
      </div>
    </aside>
  );
}
