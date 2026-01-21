import { useState, useEffect } from "react";
import "./css/ShopPage.css";

const ShopPage = ({ gameState, myId, shopType, handleAction, onExit }) => {
  const [activeTab, setActiveTab] = useState("buy");
  const [selectedItem, setSelectedItem] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [errorMsg, setErrorMsg] = useState("");

  const myPlayer = gameState.players.find((p) => p.memberId === myId);
  const shopSession = gameState.shopSession;

// 상점 타입 결정 (프롭스로 받은 것 우선, 없으면 세션 정보)
  const currentShopType = shopType || shopSession?.shopType;
  const isItemShop = currentShopType === "ITEM_SHOP";

  // 현재 턴인 사람(currentPlayerId)과 내 아이디(myId)가 일치해야 버튼이 활성화
  const isMyTurn = gameState.currentPlayerId === myId;

  const currentShopUser = gameState.players.find(
      (p) => p.memberId === (shopSession?.memberId || gameState.currentPlayerId)
  );

  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  const items = [
    { type: "CUSTOM_DICE", name: "내맘대로 주사위", price: 100 },
    { type: "PIPE", name: "토관", price: 60 },
    { type: "GOLD_PIPE", name: "금토관", price: 150 },
    { type: "GOLD_DICE", name: "금주사위", price: 100 },
    { type: "DOUBLE_DICE", name: "더블주사위", price: 80 },
    { type: "MIRROR", name: "거울", price: 70 },
    { type: "GOLD_MIRROR", name: "금거울", price: 120 },
  ];

  const resources = [
    { type: "WOOD", name: "목재", buyPrice: 120, sellPrice: 60 },
    { type: "IRON", name: "철광석", buyPrice: 80, sellPrice: 40 },
    { type: "CLOTH", name: "천", buyPrice: 60, sellPrice: 30 },
    { type: "BRICK", name: "벽돌", buyPrice: 140, sellPrice: 70 },
    { type: "WALLPAPER", name: "벽지", buyPrice: 200, sellPrice: 100 },
    { type: "CLAY", name: "점토", buyPrice: 100, sellPrice: 50 },
    { type: "FLOOR", name: "바닥", buyPrice: 160, sellPrice: 80 },
  ];

  const harvests = [
    { type: "APPLE", name: "사과", price: 80 },
    { type: "ORANGE", name: "오렌지", price: 100 },
    { type: "PEAR", name: "배", price: 120 },
    { type: "PEACH", name: "복숭아", price: 150 },
    { type: "CHERRY", name: "체리", price: 200 },
    { type: "FISH_SMALL", name: "작은 물고기", price: 50 },
    { type: "FISH_MEDIUM", name: "중간 물고기", price: 150 },
    { type: "FISH_LARGE", name: "큰 물고기", price: 300 },
  ];

  // ========== 액션 핸들러 ========== //
  const handleConfirm = () => {
    console.log('🔘 구매/판매 버튼 클릭!');

    if (!isMyTurn || !selectedItem) {
      console.error('❌ 조건 불만족:', { isMyTurn, selectedItem });
      return;
    }

    // ✅ 아이템 상점에서 이미 구매했는지 체크
    if (activeTab === "buy" && isItemShop && shopSession?.hasItemPurchased) {
      setErrorMsg("⚠️ 이미 아이템을 구매했습니다!");
      return;  // 서버 요청 안 보냄!
    }

    // ✅ 벨 부족 체크
    if (activeTab === "buy") {
      const price = isItemShop
          ? selectedItem.price
          : selectedItem.buyPrice * quantity;

      if ((currentShopUser?.bell || myPlayer.bell) < price) {
        setErrorMsg("⚠️ 벨이 부족합니다!");
        return;  // 서버 요청 안 보냄!
      }
    }

    // ✅ 판매 시 보유 수량 체크
    if (activeTab === "sell") {
      if ((selectedItem.owned || 0) < quantity) {
        setErrorMsg("⚠️ 보유한 수량이 부족합니다!");
        return;  // 서버 요청 안 보냄!
      }
    }

    let actionType = "";
    const data = { quantity };

    if (activeTab === "buy") {
      if (isItemShop) {
        actionType = "SHOP_BUY_ITEM";
        data.itemType = selectedItem.type;
      } else {
        actionType = "SHOP_BUY_RESOURCE";
        data.resourceType = selectedItem.type;
      }
    } else {
      const isHarvest = selectedItem.category === "harvest";
      actionType = isHarvest ? "SHOP_SELL_HARVEST" : "SHOP_SELL_RESOURCE";
      data[isHarvest ? "harvestType" : "resourceType"] = selectedItem.type;
    }

    console.log('📤 액션 전송:', actionType, data);
    handleAction(actionType, data);

    setSelectedItem(null);
    setQuantity(1);
  };

  const handleExitClick = () => {
    if (!isMyTurn) return;
    onExit();  // handleEventComplete 호출
  };

  const getOwnedItems = () => {
    const target = currentShopUser || myPlayer;
    const owned = [];
    resources.forEach((r) => {
      const count = target.resources?.[r.type] || 0;
      if (count > 0) owned.push({ ...r, owned: count, category: "resource" });
    });
    harvests.forEach((h) => {
      const count = target.harvests?.[h.type] || 0;
      if (count > 0) owned.push({ ...h, owned: count, category: "harvest" });
    });
    return owned;
  };

  return (
      <div className="shop-page">
        {errorMsg && (
            <div className="error-bubble-container">
              <div className="error-bubble">{errorMsg}</div>
            </div>
        )}

        <div className="shop-header">
          <h2>{isItemShop ? "🎁 아이템 상점" : "🏪 재화 상점"}</h2>
          <div className="bell-display">💰 {currentShopUser?.bell ?? 0} Bell</div>
        </div>

        <div className="shop-tabs">
          <button
              className={activeTab === "buy" ? "active" : ""}
              onClick={() => { setActiveTab("buy"); setSelectedItem(null); }}
              disabled={!isMyTurn}
          >구매
          </button>
          <button
              className={activeTab === "sell" ? "active" : ""}
              onClick={() => { setActiveTab("sell"); setSelectedItem(null); }}
              disabled={!isMyTurn}
          >판매
          </button>
        </div>

        <div className="items-grid">
          {(activeTab === "buy" ? (isItemShop ? items : resources) : getOwnedItems()).map((item) => (
              <div
                  key={item.type}
                  className={`item-card ${selectedItem?.type === item.type ? "selected" : ""} ${!isMyTurn ? "readonly" : ""}`}
                  onClick={() => { if (isMyTurn) { setSelectedItem(item); setQuantity(1); } }}
              >
                <div className="item-image" />
                <div className="item-name">{item.name}</div>

                <div className="item-price">
                  🔔 {activeTab === "buy"
                    ? (item.buyPrice || item.price)
                    : (item.sellPrice || item.price)
                }
                </div>

                {item.owned && <div className="item-owned">보유: {item.owned}</div>}
              </div>
          ))}
        </div>

        <div className="bottom-panel">
          {selectedItem ? (
              <div className="transaction-panel">
                <div className="selected-info"><strong>{selectedItem.name}</strong></div>

                {((activeTab === "buy" && !isItemShop) || activeTab === "sell") && (
                    <div className="quantity-selector">
                      <button onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={!isMyTurn || quantity <= 1}>-</button>
                      <span>{quantity}{activeTab === "sell" && ` / ${selectedItem.owned}`}</span>
                      <button onClick={() => setQuantity(Math.min(selectedItem.owned || 99, quantity + 1))} disabled={!isMyTurn || (activeTab === "sell" && quantity >= selectedItem.owned)}>+</button>
                    </div>
                )}

                {activeTab === "buy" && isItemShop && shopSession?.hasItemPurchased && (
                    <div className="warning-text">⚠️ 이미 아이템을 구매했습니다</div>
                )}

                <div className="button-group">
                  <button
                      className="confirm-btn"
                      onClick={handleConfirm}
                      disabled={!isMyTurn || (isItemShop && shopSession?.hasItemPurchased)}
                  >
                    {activeTab === "buy" ? "구매할래" : "판매할래"}
                  </button>
                  <button className="exit-btn" onClick={handleExitClick} disabled={!isMyTurn}>나가기</button>
                </div>
              </div>
          ) : (
              <div className="no-selection">
                <p>상품을 선택해주세요</p>
                <button className="exit-btn" onClick={handleExitClick} disabled={!isMyTurn}>나가기</button>
              </div>
          )}
        </div>
      </div>
  );
};

export default ShopPage;