import { useState, useEffect, useMemo } from 'react';
import './ShopPage.css';
import BellPanel from '../../../components/common/BellPanel.jsx';
import { COLORS } from '../../../constants/colors.js';

import { rewardImageSrc, RESOURCES, FRUITS, FISHES } from '../../../constants/reward.js';
import { SHOP_ITEMS, shopItemImageSrc } from '../../../constants/shopItems.js';
import ExitButton from '../../../components/common/ExitButton.jsx';
import OkButton from '../../../components/common/OkButton.jsx';
import Subtitle from '../../../components/common/Subtitle.jsx';

const shopItems = SHOP_ITEMS.map((item) => ({
  type: item.key,
  name: item.name,
  price: item.price,
  category: 'shopItem',
}));

// reward.js에서 가져와서 category 추가
const resources = RESOURCES.map((r) => ({
  type: r.key,
  name: r.name,
  buyPrice: r.buyPrice,
  sellPrice: r.sellPrice,
  category: 'resource',
}));

const harvests = [
  ...FRUITS.map((f) => ({
    type: f.key,
    name: f.name,
    price: f.price,
    category: 'harvest',
  })),
  ...FISHES.filter((f) => f.key !== 'FISH_RARE').map((f) => ({
    type: f.key,
    name: f.name,
    price: f.price,
    category: 'harvest',
  })),
];

const ShopPage = ({ gameState, myId, currentPlayer, handleAction, onExit, shopRelay }) => {
  const [activeTab, setActiveTab] = useState('buy');
  const [selectedItem, setSelectedItem] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [errorMsg, setErrorMsg] = useState('');

  const shopSession = gameState.shopSession;
  const isMyTurn = gameState.currentPlayerId === myId;

  // 탭 동기화
  useEffect(() => {
    if (currentPlayer?.uiStep === 0) {
      setActiveTab('buy');
    } else if (currentPlayer?.uiStep === 1) {
      setActiveTab('sell');
    }
  }, [currentPlayer?.uiStep]);

  // 에러 메시지 자동 숨김
  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  // 서버 에러 메시지 표시
  useEffect(() => {
    if (gameState?.errorMessage) {
      console.error(gameState.errorMessage);
      setErrorMsg(gameState.errorMessage);
    }
  }, [gameState?.errorMessage]);

  // 내 턴이면 마운트 시 선택 초기화 (새로고침 대응)
  useEffect(() => {
    if (isMyTurn) {
      handleAction('SHOP_SELECT_CLEAR', {});
    }
  }, []);

  // ✅ 관전자 하이라이트/패널용: relay 선택 정보 파싱
  const relaySelectedType =
    shopRelay?.type === 'SHOP_SELECT_RELAY'
      ? shopRelay.shopItemType || shopRelay.resourceType || shopRelay.harvestType
      : null;

  const relayQuantity =
    shopRelay?.type === 'SHOP_SELECT_RELAY' && Number.isFinite(shopRelay.quantity) ? shopRelay.quantity : 1;

  const getOwnedItems = (player) => {
    // ✅ () → (player) 변경!
    if (!player) return []; // ✅ 추가!

    const owned = [];
    resources.forEach((r) => {
      const count = player.resources?.[r.type] || 0; // ✅ currentPlayer → player
      if (count > 0) owned.push({ ...r, owned: count, category: 'resource' });
    });
    harvests.forEach((h) => {
      const count = player.harvests?.[h.type] || 0; // ✅ currentPlayer → player
      if (count > 0) owned.push({ ...h, owned: count, category: 'harvest' });
    });
    return owned;
  };

  // ✅ 내 화면은 로컬 selectedItem, 관전자 화면은 relay를 "선택된 것"으로 본다
  const displaySelected = useMemo(() => {
    if (isMyTurn) return selectedItem;

    if (!relaySelectedType) return null;

    // buy 목록(상점아이템+재화) + sell 목록(보유 재화/수확물) 어디에서든 찾아 표시해주기
    const buyList = [...shopItems, ...resources];
    const fromBuy = buyList.find((x) => x.type === relaySelectedType);
    if (fromBuy) return fromBuy;

    // sell은 보유 목록에서 찾아야 owned까지 표시 가능
    if (!currentPlayer) return null;
    const owned = getOwnedItems(currentPlayer);
    return owned.find((x) => x.type === relaySelectedType) || null;
  }, [isMyTurn, selectedItem, relaySelectedType, currentPlayer]);

  // ========== relay 전송 helpers ========== //
  const sendShopSelect = (item, nextQuantity = 1) => {
    if (!isMyTurn || !item) return;

    const payload = { quantity: nextQuantity };

    if (activeTab === 'buy') {
      if (item.category === 'shopItem') payload.shopItemType = item.type;
      else payload.resourceType = item.type;
    } else {
      // sell: resource or harvest
      if (item.category === 'harvest') payload.harvestType = item.type;
      else payload.resourceType = item.type;
    }

    handleAction('SHOP_SELECT', payload);
  };

  const clearShopSelect = () => {
    if (!isMyTurn) return;
    handleAction('SHOP_SELECT_CLEAR', {});
  };

  const buyList = useMemo(() => [...shopItems, ...resources], []);
  const sellList = useMemo(() => getOwnedItems(currentPlayer), [currentPlayer]);

  // ========== 구매 제한(상점아이템: 종류별 1개) UX용 체크 ========== //
  const purchasedSet = shopSession?.purchasedItems || [];
  const isPurchasedShopItem = (item) =>
    item?.category === 'shopItem' && Array.isArray(purchasedSet)
      ? purchasedSet.includes(item.type)
      : item?.category === 'shopItem' && purchasedSet?.has
        ? purchasedSet.has(item.type)
        : false;

  // ========== 탭 변경 ========== //
  const handleTabChange = (newTab) => {
    if (!isMyTurn) return;

    const newStep = newTab === 'buy' ? 0 : 1;
    handleAction('SHOP_TAB_CHANGE', { uiStep: newStep });

    setActiveTab(newTab);
    setSelectedItem(null);
    setQuantity(1);
    clearShopSelect(); // ✅ 관전자 하이라이트도 제거
  };

  // ========== 총액 계산 (내 선택 or 관전자 표시용) ========== //
  const calcTotalPrice = (item, qty, tab) => {
    if (!item) return 0;

    if (tab === 'buy') {
      const unit = item.category === 'shopItem' ? item.price : item.buyPrice;
      return (unit || 0) * (qty || 1);
    }

    // sell
    const unit = item.category === 'resource' ? item.sellPrice : item.price;
    return (unit || 0) * (qty || 1);
  };

  const effectiveQty = isMyTurn ? quantity : relayQuantity;
  const totalPrice = calcTotalPrice(displaySelected, effectiveQty, activeTab);

  const canAfford = (currentPlayer?.bell ?? 0) >= totalPrice;

  // ========== 수량 변경 (내 턴에서만 가능) ========== //
  const getMaxBuyQuantity = (item) => {
    if (!item) return 1;
    if (item.category === 'shopItem') return 1; // 상점아이템은 1개 고정
    const unit = item.buyPrice || 0;
    if (unit <= 0) return 1;
    const maxByMoney = Math.floor((currentPlayer?.bell ?? 0) / unit);
    return Math.max(1, Math.min(99, maxByMoney));
  };

  const getMaxSellQuantity = (item) => Math.max(1, item?.owned || 1);

  const changeQuantity = (next) => {
    if (!isMyTurn) return;
    const safe = Math.max(1, next);
    setQuantity(safe);
    if (selectedItem) sendShopSelect(selectedItem, safe); // ✅ 관전자에게도 수량 반영
  };

  // ========== 확정(구매/판매) ========== //
  const handleConfirm = () => {
    if (!isMyTurn || !selectedItem) return;

    // ✅ 상점 아이템: 종류별 1개 제한
    if (activeTab === 'buy' && selectedItem.category === 'shopItem' && isPurchasedShopItem(selectedItem)) {
      setErrorMsg('⚠️ 이미 구매한 상점 아이템입니다!');
      return;
    }

    // ✅ 벨 부족 체크
    if (activeTab === 'buy') {
      const cost = calcTotalPrice(selectedItem, quantity, 'buy');
      if ((currentPlayer?.bell ?? 0) < cost) {
        setErrorMsg('⚠️ 벨이 부족합니다!');
        return;
      }
    }

    // ✅ 판매 시 보유 수량 체크
    if (activeTab === 'sell') {
      if ((selectedItem.owned || 0) < quantity) {
        setErrorMsg('⚠️ 보유한 수량이 부족합니다!');
        return;
      }
    }

    let actionType = '';
    const data = { quantity };

    if (activeTab === 'buy') {
      if (selectedItem.category === 'shopItem') {
        actionType = 'SHOP_BUY_ITEM';
        data.shopItemType = selectedItem.type;
        data.quantity = 1; // 상점아이템은 1개 고정
      } else {
        actionType = 'SHOP_BUY_RESOURCE';
        data.resourceType = selectedItem.type;
      }
    } else {
      if (selectedItem.category === 'harvest') {
        actionType = 'SHOP_SELL_HARVEST';
        data.harvestType = selectedItem.type;
      } else {
        actionType = 'SHOP_SELL_RESOURCE';
        data.resourceType = selectedItem.type;
      }
    }

    handleAction(actionType, data);

    // 로컬 초기화 + 관전자 하이라이트 해제
    setSelectedItem(null);
    setQuantity(1);
    clearShopSelect();
  };

  const handleExitClick = () => {
    if (!isMyTurn) return;
    clearShopSelect();
    onExit();
  };

  const gridList = activeTab === 'buy' ? buyList : sellList;

  // gridList를 4개씩 묶어서 행으로 분리
  const chunkArray = (arr, size) => {
    const result = [];
    for (let i = 0; i < arr.length; i += size) {
      result.push(arr.slice(i, i + size));
    }
    return result;
  };

  const rows = chunkArray(gridList, 4);

  return (
    <div className="shop-page">
      {errorMsg && (
        <div className="error-bubble-container">
          <div className="error-bubble">{errorMsg}</div>
        </div>
      )}

      {/* 벨 패널 */}
      <BellPanel amount={currentPlayer?.bell ?? 0} />

      {/* 판매 / 구매 탭 */}
      <div className="shop-tabs">
        <button
          className={activeTab === 'buy' ? 'active' : ''}
          onClick={() => handleTabChange('buy')}
          disabled={!isMyTurn}
        >
          <img src="/images/shop/ui-shop-tap.webp" alt="" className="tab-bg" />
          <div className="tab-content">
            <svg className="tab-icon tab-icon-buy" viewBox="0 0 256 256" fill={COLORS.ac.creamIvory}>
              <path d="M245,75.4L245,75.4l-33.2,73.8l0,0c-1.6,3.6-5.2,6.2-9.3,6.5l0,0l-95.6,6.4l5.5,15.8h104.1c12.2,0,22.1,9.9,22.1,22.1c0,12.2-9.9,22.2-22.1,22.2c-12.2,0-22.2-9.9-22.2-22.2H91.1c0,12.2-9.9,22.2-22.1,22.2c-12.2,0-22.1-9.9-22.1-22.2c0-12.2,9.9-22.1,22.1-22.1h20L46.4,56.1H21.1c-6.1,0-11.1-5-11.1-11.1C10,38.9,15,34,21.1,34h33.2c4.8,0,8.9,3.1,10.4,7.4l0,0l6.4,18.4h163.8c6.1,0,11.1,5,11.1,11.1C246,72.4,245.6,74,245,75.4z" />
            </svg>
            <span style={{ color: COLORS.ac.creamIvory }}>구매</span>
          </div>
        </button>

        <button
          className={activeTab === 'sell' ? 'active' : ''}
          onClick={() => handleTabChange('sell')}
          disabled={!isMyTurn}
        >
          <img src="/images/shop/ui-shop-tap.webp" alt="" className="tab-bg" />
          <div className="tab-content">
            <svg className="tab-icon tab-icon-sell" viewBox="0 0 64 64" fill={COLORS.ac.creamIvory}>
              <path d="M60,0H4C1.789,0,0,1.789,0,4v8c0,2.211,1.789,4,4,4h56c2.211,0,4-1.789,4-4V4C64,1.789,62.211,0,60,0z" />
              <path d="M4,24v36c0,2.211,1.789,4,4,4h48c2.211,0,4-1.789,4-4V24H4z M40,40H24c-2.211,0-4-1.789-4-4s1.789-4,4-4h16c2.211,0,4,1.789,4,4S42.211,40,40,40z" />
            </svg>
            <span style={{ color: COLORS.ac.creamIvory }}>판매</span>
          </div>
        </button>
      </div>

      {/* 아이템 목록 패널 */}
      <div className="items-panel">
        <div className="items-scroll">
          <div className="items-grid">
            {rows.map((row, rowIndex) => (
              <div key={rowIndex} className="item-row">
                {row.map((item) => {
                  const selected = isMyTurn ? selectedItem?.type === item.type : relaySelectedType === item.type;
                  const disabledShopItem =
                    activeTab === 'buy' && item.category === 'shopItem' && isPurchasedShopItem(item);

                  return (
                    <div
                      key={`${item.category}-${item.type}`}
                      className={`item-card ${selected ? 'selected' : ''} ${!isMyTurn ? 'readonly' : ''} ${disabledShopItem ? 'disabled' : ''}`}
                      onClick={() => {
                        if (!isMyTurn || disabledShopItem) return;
                        setSelectedItem(item);
                        setQuantity(1);
                        sendShopSelect(item, 1);
                      }}
                    >
                      {disabledShopItem && (
                        <div className="sold-out-badge">
                          <span className="badge-icon">🚫</span>
                          <span className="badge-text">SOLD OUT</span>
                        </div>
                      )}
                      <div
                        className="shop-item-image"
                        style={{
                          backgroundImage: `url(${
                            item.category === 'shopItem' ? shopItemImageSrc(item.type) : rewardImageSrc(item.type)
                          })`,
                        }}
                      />
                      <div className="item-info">
                        <svg className="bell-icon" viewBox="0 0 724 794" fill={COLORS.ac.creamWhite}>
                          <path d="M 329.00 791.93 C266.86,789.67 211.19,780.24 163.24,763.85 C119.04,748.74 88.07,730.68 60.65,704.02 C21.04,665.52 1.99,617.33 2.01,555.70 C2.03,455.66 63.55,357.21 167.24,291.25 C210.96,263.44 258.16,245.05 313.25,234.37 C315.96,233.85 316.00,233.91 316.00,239.02 C316.00,246.77 318.60,248.71 337.28,254.88 C362.81,263.31 402.14,274.78 428.94,281.60 C442.93,285.16 455.49,288.62 456.85,289.29 C458.81,290.24 460.67,293.86 465.64,306.31 C480.29,343.04 490.36,377.41 495.01,406.50 C496.08,413.21 500.00,442.78 500.00,444.17 C500.00,446.13 505.52,451.01 508.31,451.52 C510.15,451.86 518.47,450.83 527.92,449.08 C546.24,445.70 549.33,444.06 550.65,437.07 C552.97,424.76 538.76,369.43 524.63,335.75 C521.33,327.87 520.57,325.24 521.81,325.91 C522.74,326.41 529.61,333.05 537.07,340.66 C558.17,362.17 576.38,386.02 590.41,410.50 C597.47,422.83 599.52,424.99 604.81,425.70 C608.49,426.20 609.76,425.72 617.06,421.08 C636.74,408.59 640.08,404.73 637.98,396.93 C636.74,392.32 621.73,369.45 612.17,357.60 C590.64,330.92 566.21,309.30 534.27,288.66 C524.43,282.31 524.07,281.95 525.02,279.46 C525.56,278.04 526.00,274.87 526.00,272.43 C526.00,270.00 526.19,268.00 526.42,268.00 C527.75,268.00 537.74,272.85 545.50,277.26 C584.77,299.59 625.35,333.95 652.07,367.50 C669.39,389.23 681.32,408.15 693.09,432.50 C715.10,478.06 725.42,528.33 722.18,574.24 C719.43,613.31 708.77,645.77 688.95,675.50 C680.12,688.73 657.66,711.80 643.00,722.69 C586.72,764.50 504.72,787.60 397.00,791.98 C370.30,793.07 360.04,793.06 329.00,791.93 ZM 343.78 639.44 C349.50,635.43 349.64,634.16 350.88,575.00 C351.37,551.71 352.01,538.78 352.76,537.41 C353.38,536.27 369.56,523.38 388.70,508.78 C407.84,494.18 424.72,481.02 426.20,479.53 C432.53,473.19 432.07,464.04 425.21,459.54 C423.17,458.21 403.43,451.06 381.35,443.65 C359.27,436.24 340.31,429.70 339.22,429.12 C336.74,427.79 338.16,431.46 322.52,385.71 C313.61,359.62 308.50,346.10 306.94,344.44 C305.67,343.08 302.94,341.46 300.90,340.85 C293.64,338.68 290.87,341.02 264.38,371.74 C251.25,386.96 238.32,402.03 235.65,405.23 C232.98,408.42 229.94,411.50 228.90,412.06 C227.85,412.61 208.89,414.40 186.75,416.02 C141.42,419.34 141.07,419.38 135.34,422.11 C130.48,424.43 127.46,430.29 128.44,435.52 C128.76,437.23 136.75,451.42 146.19,467.06 C169.42,505.53 172.00,510.10 172.00,512.66 C172.00,513.87 169.55,522.88 166.55,532.68 C151.18,582.87 146.00,600.54 146.00,602.69 C146.00,606.30 148.51,611.55 151.12,613.37 C154.61,615.82 161.82,615.37 172.24,612.06 C188.95,606.75 246.45,589.19 248.50,588.77 C251.52,588.14 253.89,589.55 289.00,612.83 C332.07,641.39 331.41,641.00 336.97,641.00 C339.51,641.00 342.55,640.30 343.78,639.44 ZM 518.44 248.66 C515.45,245.47 513.08,244.00 509.44,243.08 C501.92,241.17 487.05,240.55 481.41,241.90 C477.39,242.86 475.13,242.79 469.00,241.50 C457.40,239.06 395.00,221.28 365.56,212.02 C356.79,209.26 349.05,207.00 348.35,207.00 C346.13,207.00 345.14,203.68 343.10,189.40 C333.98,125.57 341.19,79.16 365.25,46.85 C388.84,15.16 429.98,-2.41 470.36,1.94 C500.16,5.15 526.56,16.31 541.29,31.92 C553.27,44.63 557.67,55.19 559.05,74.61 C560.00,88.06 561.79,93.33 566.47,96.39 C567.90,97.32 573.29,99.56 578.45,101.36 C604.90,110.57 623.49,130.02 629.92,155.19 C635.60,177.41 632.40,197.85 620.69,214.19 C608.32,231.44 587.95,241.78 552.08,249.02 C543.94,250.66 533.96,252.22 529.89,252.49 L 522.50 252.98 L 518.44 248.66 Z" />
                        </svg>
                        <span className="item-price" style={{ color: COLORS.ac.creamWhite }}>
                          {activeTab === 'buy'
                            ? item.category === 'shopItem'
                              ? item.price
                              : item.buyPrice
                            : item.category === 'resource'
                              ? item.sellPrice
                              : item.price}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* 마지막 줄 아니면 노란 구분선 */}
                {rowIndex < rows.length - 1 && (
                  <div className="item-row-divider" style={{ backgroundColor: COLORS.ac.softYellow }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 인트로 자막 - 처음 한 번만 */}
      {!shopSession?.introShown && (
        <Subtitle
          nameText="콩돌이"
          nameColor={COLORS.characters.naugul.nameBox}
          nameTextColor={COLORS.characters.naugul.nameText}
          contentText={`오늘은 이런 상품을\n판매하고 있습니다-! 있습니다-!`}
          showTriangle={isMyTurn}
          clickTriangle={isMyTurn ? () => handleAction('SHOP_INTRO_DONE', {}) : undefined}
        />
      )}

      {/* 구매/판매 패널 - 별도 위치 */}
      {displaySelected && (
        <div className="buy-panel">
          <p className="buy-panel-text">
            {displaySelected.name}{' '}
            <span style={{ color: COLORS.ac.nookCyan }}>
              {activeTab === 'buy'
                ? displaySelected.category === 'shopItem'
                  ? displaySelected.price
                  : displaySelected.buyPrice
                : displaySelected.category === 'resource'
                  ? displaySelected.sellPrice
                  : displaySelected.price}
              벨
            </span>
            인데 몇개 {activeTab === 'buy' ? '사' : '파'}시나요-?{' '}
            <span className="text-small">{activeTab === 'buy' ? '사' : '파'}시나요-?</span>
          </p>

          {/* - 버튼 */}
          <button
            className="quantity-btn minus"
            style={{ color: COLORS.ac.darkBrown }}
            onClick={() => changeQuantity(quantity - 1)}
            disabled={!isMyTurn || quantity <= 1}
          >
            -
          </button>

          {/* 수량 */}
          <span className="quantity-display" style={{ color: COLORS.ac.creamWhite }}>
            {effectiveQty}
          </span>

          {/* + 버튼 */}
          <button
            className="quantity-btn plus"
            style={{ color: COLORS.ac.darkBrown }}
            onClick={() => {
              const max =
                activeTab === 'buy' ? getMaxBuyQuantity(displaySelected) : getMaxSellQuantity(displaySelected);
              changeQuantity(Math.min(max, quantity + 1));
            }}
            disabled={
              !isMyTurn ||
              (activeTab === 'buy'
                ? quantity >= getMaxBuyQuantity(displaySelected)
                : quantity >= getMaxSellQuantity(displaySelected))
            }
          >
            +
          </button>

          {/* 합계 */}
          <span className="total-bell" style={{ color: COLORS.ac.nookCyan }}>
            {totalPrice.toLocaleString()}벨
          </span>
        </div>
      )}

      <OkButton
        onClick={handleConfirm}
        label={activeTab === 'buy' ? '구매할래' : '판매할래'}
        disabled={
          !isMyTurn ||
          !selectedItem ||
          (activeTab === 'buy' && selectedItem?.category === 'shopItem' && isPurchasedShopItem(selectedItem)) ||
          (activeTab === 'buy' && !canAfford)
        }
      />
      <ExitButton onClick={handleExitClick} disabled={!isMyTurn} />
    </div>
  );
};

export default ShopPage;
