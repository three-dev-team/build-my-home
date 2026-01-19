import { useState, useEffect } from 'react';
import './css/ShopPage.css';

const ShopPage = ({ gameState, stompClient, myId, roomId, shopType }) => {
    const [activeTab, setActiveTab] = useState('buy');
    const [selectedItem, setSelectedItem] = useState(null);
    const [quantity, setQuantity] = useState(1);

    const myPlayer = gameState.players.find(p => p.memberId === myId);
    const shopSession = gameState.shopSession;

    const currentShopType = shopType || shopSession?.shopType;
    const isItemShop = currentShopType === 'ITEM_SHOP';


    const items = [
        { type: 'CUSTOM_DICE', name: '내맘대로 주사위', price: 100 },
        { type: 'PIPE', name: '토관', price: 60 },
        { type: 'GOLD_PIPE', name: '금토관', price: 150 },
        { type: 'GOLD_DICE', name: '금주사위', price: 100 },
        { type: 'DOUBLE_DICE', name: '더블주사위', price: 80 },
        { type: 'MIRROR', name: '거울', price: 70 },
        { type: 'GOLD_MIRROR', name: '금거울', price: 120 }
    ];

    const resources = [
        { type: 'WOOD', name: '목재', buyPrice: 120, sellPrice: 60 },
        { type: 'IRON', name: '철광석', buyPrice: 80, sellPrice: 40 },
        { type: 'CLOTH', name: '천', buyPrice: 60, sellPrice: 30 },
        { type: 'BRICK', name: '벽돌', buyPrice: 140, sellPrice: 70 },
        { type: 'WALLPAPER', name: '벽지', buyPrice: 200, sellPrice: 100 },
        { type: 'CLAY', name: '점토', buyPrice: 100, sellPrice: 50 },
        { type: 'FLOOR', name: '바닥', buyPrice: 160, sellPrice: 80 }
    ];

    const harvests = [
        { type: 'APPLE', name: '사과', price: 80 },
        { type: 'ORANGE', name: '오렌지', price: 100 },
        { type: 'PEAR', name: '배', price: 120 },
        { type: 'PEACH', name: '복숭아', price: 150 },
        { type: 'CHERRY', name: '체리', price: 200 },
        { type: 'FISH_SMALL', name: '작은 물고기', price: 50 },
        { type: 'FISH_MEDIUM', name: '중간 물고기', price: 150 },
        { type: 'FISH_LARGE', name: '큰 물고기', price: 300 }
    ];

    const handleBuyItem = () => {
        if (!selectedItem) return;

        console.log('📤 아이템 구매 요청:', selectedItem.type);
        stompClient.publish({
            destination: '/app/shop/buy-item',
            body: JSON.stringify({
                roomId: roomId,
                itemType: selectedItem.type
            })
        });

        setSelectedItem(null);
        setQuantity(1);
    };

    const handleBuyResource = () => {
        if (!selectedItem || quantity <= 0) return;

        console.log('📤 재화 구매 요청:', selectedItem.type, quantity);
        stompClient.publish({
            destination: '/app/shop/buy-resource',
            body: JSON.stringify({
                roomId: roomId,
                resourceType: selectedItem.type,
                quantity: quantity
            })
        });

        setSelectedItem(null);
        setQuantity(1);
    };

    const handleSellResource = () => {
        if (!selectedItem || quantity <= 0) return;

        console.log('📤 재화 판매 요청:', selectedItem.type, quantity);
        stompClient.publish({
            destination: '/app/shop/sell-resource',
            body: JSON.stringify({
                roomId: roomId,
                resourceType: selectedItem.type,
                quantity: quantity
            })
        });

        setSelectedItem(null);
        setQuantity(1);
    };

    const handleSellHarvest = () => {
        if (!selectedItem || quantity <= 0) return;

        console.log('📤 작물 판매 요청:', selectedItem.type, quantity);
        stompClient.publish({
            destination: '/app/shop/sell-harvest',
            body: JSON.stringify({
                roomId: roomId,
                harvestType: selectedItem.type,
                quantity: quantity
            })
        });

        setSelectedItem(null);
        setQuantity(1);
    };

    const handleExit = () => {
        console.log('🚪 나가기 버튼 클릭!');
        console.log('📦 roomId:', roomId);
        console.log('🎮 현재 status:', gameState.status);

        stompClient.publish({
            destination: '/app/shop/end',
            body: JSON.stringify({
                roomId: roomId
            })
        });

        console.log('📤 /app/shop/end 메시지 전송 완료');
    };

    const handleConfirm = () => {
        if (activeTab === 'buy') {
            if (isItemShop) {
                handleBuyItem();
            } else {
                handleBuyResource();
            }
        } else {
            if (selectedItem.sellPrice) {
                handleSellResource();
            } else {
                handleSellHarvest();
            }
        }
    };

    const getOwnedItems = () => {
        const owned = [];

        resources.forEach(resource => {
            const count = myPlayer.resources[resource.type] || 0;
            if (count > 0) {
                owned.push({ ...resource, owned: count, category: 'resource' });
            }
        });

        harvests.forEach(harvest => {
            const count = myPlayer.harvests[harvest.type] || 0;
            if (count > 0) {
                owned.push({ ...harvest, owned: count, category: 'harvest' });
            }
        });

        return owned;
    };

    return (
        <div className="shop-page-v3">
            <div className="shop-header">
                <h2>{isItemShop ? '🎁 아이템 상점' : '🏪 재화 상점'}</h2>
                <div className="bell-display">💰 {myPlayer.bell}</div>
            </div>

            <div className="shop-tabs">
                <button
                    className={activeTab === 'buy' ? 'active' : ''}
                    onClick={() => { setActiveTab('buy'); setSelectedItem(null); }}
                >
                    구매
                </button>
                <button
                    className={activeTab === 'sell' ? 'active' : ''}
                    onClick={() => { setActiveTab('sell'); setSelectedItem(null); }}
                >
                    판매
                </button>
            </div>

            <div className="items-grid">
                {activeTab === 'buy' ? (
                    isItemShop ? (
                        items.map(item => (
                            <div
                                key={item.type}
                                className={`item-card ${selectedItem?.type === item.type ? 'selected' : ''}`}
                                onClick={() => { setSelectedItem(item); setQuantity(1); }}
                            >
                                <div className="item-image" style={{ backgroundImage: `url(${item.image})` }} />
                                <div className="item-name">{item.name}</div>
                                <div className="item-price">🔔 {item.price}</div>
                            </div>
                        ))
                    ) : (
                        resources.map(resource => (
                            <div
                                key={resource.type}
                                className={`item-card ${selectedItem?.type === resource.type ? 'selected' : ''}`}
                                onClick={() => { setSelectedItem(resource); setQuantity(1); }}
                            >
                                <div className="item-image" style={{ backgroundImage: `url(${resource.image})` }} />
                                <div className="item-name">{resource.name}</div>
                                <div className="item-price">🔔 {resource.buyPrice}</div>
                            </div>
                        ))
                    )
                ) : (
                    getOwnedItems().map(item => (
                        <div
                            key={item.type}
                            className={`item-card ${selectedItem?.type === item.type ? 'selected' : ''}`}
                            onClick={() => { setSelectedItem(item); setQuantity(1); }}
                        >
                            <div className="item-image" style={{ backgroundImage: `url(${item.image})` }} />
                            <div className="item-name">{item.name}</div>
                            <div className="item-price">
                                🔔 {item.sellPrice || item.price}
                            </div>
                            <div className="item-owned">보유: {item.owned}개</div>
                        </div>
                    ))
                )}
            </div>

            <div className="bottom-panel">
                {selectedItem ? (
                    <div className="transaction-panel">
                        <div className="selected-info">
                            <strong>{selectedItem.name}</strong> 선택됨
                        </div>

                        {(activeTab === 'buy' && !isItemShop) || activeTab === 'sell' ? (
                            <div className="quantity-selector">
                                <button
                                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                    disabled={quantity <= 1}
                                >
                                    -
                                </button>
                                <span>
                                    {quantity}
                                    {activeTab === 'sell' && selectedItem?.owned && (
                                        <small style={{ fontSize: '14px', color: '#666', marginLeft: '5px' }}>
                                            / {selectedItem.owned}
                                        </small>
                                    )}
                                </span>
                                <button
                                    onClick={() => setQuantity(quantity + 1)}
                                    disabled={
                                        activeTab === 'sell' && selectedItem?.owned && quantity >= selectedItem.owned
                                    }
                                >
                                    +
                                </button>
                            </div>
                        ) : null}

                        {activeTab === 'buy' && isItemShop && gameState.shopSession?.hasItemPurchased && (
                            <div className="warning-message">
                                ⚠️ 이미 아이템을 구매했습니다
                            </div>
                        )}

                        <div className="button-group">
                            <button
                                className="confirm-btn"
                                onClick={handleConfirm}
                                disabled={
                                    activeTab === 'buy'
                                        ? (isItemShop && shopSession?.hasItemPurchased) ||
                                        myPlayer.bell < (selectedItem.buyPrice || selectedItem.price) * quantity
                                        : (selectedItem.owned || 0) < quantity
                                }
                            >
                                {activeTab === 'buy' ? '구매할래' : '판매할래'}
                            </button>
                            <button className="exit-btn" onClick={handleExit}>
                                나가기
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="no-selection">
                        <p>상품을 선택해주세요</p>
                        <button className="exit-btn" onClick={handleExit}>
                            나가기
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ShopPage;