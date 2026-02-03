import { useState, useEffect, useMemo } from 'react';
import { useGameTimer } from '../../hooks/useGameTimer.js';
import './css/ShopPage.css';
import BellPanel from '../../components/common/BellPanel.jsx';

const shopItems = [
  { type: 'FISHING_CHANCE', name: '낚시 떡밥', price: 300, category: 'shopItem' },
  { type: 'TARANTULA', name: '타란튤라', price: 200, category: 'shopItem' },
  { type: 'WATERING', name: '물뿌리개', price: 50, category: 'shopItem' },
  { type: 'KK_TICKET', name: 'KK 관람 티켓', price: 50, category: 'shopItem' },
];

const resources = [
  { type: 'WOOD', name: '목재', buyPrice: 120, sellPrice: 60, category: 'resource' },
  { type: 'IRON', name: '철광석', buyPrice: 80, sellPrice: 40, category: 'resource' },
  { type: 'CLOTH', name: '천', buyPrice: 60, sellPrice: 30, category: 'resource' },
  { type: 'BRICK', name: '벽돌', buyPrice: 140, sellPrice: 70, category: 'resource' },
  { type: 'WALLPAPER', name: '벽지', buyPrice: 200, sellPrice: 100, category: 'resource' },
  { type: 'CLAY', name: '점토', buyPrice: 100, sellPrice: 50, category: 'resource' },
  { type: 'FLOORING', name: '바닥', buyPrice: 160, sellPrice: 80, category: 'resource' },
];

const harvests = [
  { type: 'APPLE', name: '사과', price: 80, category: 'harvest' },
  { type: 'ORANGE', name: '오렌지', price: 100, category: 'harvest' },
  { type: 'PEAR', name: '배', price: 120, category: 'harvest' },
  { type: 'PEACH', name: '복숭아', price: 150, category: 'harvest' },
  { type: 'CHERRY', name: '체리', price: 200, category: 'harvest' },
  { type: 'FISH_SMALL', name: '작은 물고기', price: 50, category: 'harvest' },
  { type: 'FISH_MEDIUM', name: '중간 물고기', price: 150, category: 'harvest' },
  { type: 'FISH_LARGE', name: '큰 물고기', price: 300, category: 'harvest' },
];

const ShopPage = ({ gameState, myId, currentPlayer, shopType, handleAction, onExit, shopRelay }) => {
  const [activeTab, setActiveTab] = useState('buy');
  const [selectedItem, setSelectedItem] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [errorMsg, setErrorMsg] = useState('');

  const timeoutSeconds = gameState.timeoutSeconds;
  const { timeLeft, isUrgent } = useGameTimer(timeoutSeconds);

  const shopSession = gameState.shopSession;
  const isMyTurn = gameState.currentPlayerId === myId;

  useEffect(() => {
    if (currentPlayer?.uiStep === 0) {
      setActiveTab('buy');
    } else if (currentPlayer?.uiStep === 1) {
      setActiveTab('sell');
    }
  }, [currentPlayer?.uiStep]);

  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  useEffect(() => {
    if (gameState?.errorMessage) {
      console.error(gameState.errorMessage); //
      setErrorMsg(gameState.errorMessage);
    }
  }, [gameState?.errorMessage]);

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
    handleAction('SET_STEP', { uiStep: newStep });

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

  return (
    <div className="shop-page">
      {errorMsg && (
        <div className="error-bubble-container">
          <div className="error-bubble">{errorMsg}</div>
        </div>
      )}

      <div>
        <BellPanel amount={currentPlayer?.bell ?? 0} />
      </div>

      <div className="shop-tabs">
        <button
          className={activeTab === 'buy' ? 'active' : ''}
          onClick={() => handleTabChange('buy')}
          disabled={!isMyTurn}
        >
          구매
        </button>
        <button
          className={activeTab === 'sell' ? 'active' : ''}
          onClick={() => handleTabChange('sell')}
          disabled={!isMyTurn}
        >
          판매
        </button>
      </div>

      <div className="items-grid">
        {gridList.map((item) => {
          const selected = isMyTurn ? selectedItem?.type === item.type : relaySelectedType === item.type;

          const disabledShopItem = activeTab === 'buy' && item.category === 'shopItem' && isPurchasedShopItem(item);

          return (
            <div
              key={`${item.category}-${item.type}`}
              className={`item-card ${selected ? 'selected' : ''} ${!isMyTurn ? 'readonly' : ''} ${
                disabledShopItem ? 'disabled' : ''
              }`}
              onClick={() => {
                if (!isMyTurn) return;
                if (disabledShopItem) return; // 이미 산 상점아이템은 클릭 막기(UX)

                setSelectedItem(item);
                // 상점아이템은 1개 고정
                const nextQty = item.category === 'shopItem' ? 1 : 1;
                setQuantity(nextQty);

                sendShopSelect(item, nextQty);
              }}
            >
              {disabledShopItem && (
                <div className="sold-out-badge">
                  <span className="badge-icon">🚫</span>
                  <span className="badge-text">SOLD OUT</span>
                </div>
              )}
              <div className="item-image" />
              <div className="item-name">{item.name}</div>

              <div className="item-price">
                🔔{' '}
                {activeTab === 'buy'
                  ? item.category === 'shopItem'
                    ? item.price
                    : item.buyPrice
                  : item.category === 'resource'
                    ? item.sellPrice
                    : item.price}
              </div>

              {item.owned != null && <div className="item-owned">보유: {item.owned}</div>}
            </div>
          );
        })}
      </div>

      {/* 하단 패널: 내 턴은 selectedItem, 관전자는 relay로 보이는 선택 */}
      <div className="bottom-panel">
        {displaySelected ? (
          <div className="transaction-panel">
            <div className="selected-info">
              <strong>{displaySelected.name}</strong>
            </div>

            {/* 수량 선택: buy(resource) 또는 sell(resource/harvest)만 */}
            {isMyTurn && (
              <>
                {((activeTab === 'buy' && displaySelected.category !== 'shopItem') || activeTab === 'sell') && (
                  <div className="quantity-selector">
                    <button onClick={() => changeQuantity(quantity - 1)} disabled={!isMyTurn || quantity <= 1}>
                      -
                    </button>

                    <span>
                      {quantity}
                      {activeTab === 'sell' && ` / ${displaySelected.owned}`}
                    </span>

                    <button
                      onClick={() => {
                        const max =
                          activeTab === 'buy'
                            ? getMaxBuyQuantity(displaySelected)
                            : getMaxSellQuantity(displaySelected);
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
                  </div>
                )}
              </>
            )}

            {/* 관전자에게도 수량/총액은 보여주기 */}
            {!isMyTurn && (
              <div className="quantity-selector readonly">
                <span>수량: {relayQuantity}</span>
              </div>
            )}

            <div className={`total-price-display ${activeTab === 'buy' && !canAfford ? 'insufficient' : ''}`}>
              <span className="label">{activeTab === 'buy' ? '결제 예정' : '예상 수입'}</span>
              <span className="amount">🔔 {totalPrice.toLocaleString()} Bell</span>
              {activeTab === 'buy' && isMyTurn && !canAfford && <div className="shortage-msg">잔액이 부족합니다!</div>}
            </div>

            {/* 상점아이템 구매 완료 경고 */}
            {activeTab === 'buy' && displaySelected.category === 'shopItem' && isPurchasedShopItem(displaySelected) && (
              <div className="warning-text">⚠️ 이미 구매한 상점 아이템입니다</div>
            )}

            <div className="button-group">
              <button
                className="confirm-btn"
                onClick={handleConfirm}
                disabled={
                  !isMyTurn ||
                  !selectedItem ||
                  (activeTab === 'buy' && selectedItem?.category === 'shopItem' && isPurchasedShopItem(selectedItem)) ||
                  (activeTab === 'buy' && !canAfford)
                }
              >
                {activeTab === 'buy' ? '구매할래' : '판매할래'}
              </button>
              <button className="exit-btn" onClick={handleExitClick} disabled={!isMyTurn}>
                나가기
              </button>
            </div>
          </div>
        ) : (
          <div className="no-selection">
            <p>상품을 선택해주세요</p>
            <button className="exit-btn" onClick={handleExitClick} disabled={!isMyTurn}>
              나가기
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShopPage;
