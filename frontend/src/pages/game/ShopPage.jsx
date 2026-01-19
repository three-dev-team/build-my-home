// import { useState, useEffect } from 'react';
// import './ShopPage.css';
//
// const ShopPage = ({ gameState, stompClient, myId }) => {
//     const [activeTab, setActiveTab] = useState('buy'); // 'buy' or 'sell'
//     const [selectedItem, setSelectedItem] = useState(null);
//     const [quantity, setQuantity] = useState(1);
//     const [timeLeft, setTimeLeft] = useState(20); // 20초 타이머
//
//     const myPlayer = gameState.players.find(p => p.memberId === myId);
//     const shopSession = gameState.shopSession;
//     const isItemShop = shopSession?.shopType === 'ITEM_SHOP';
//
//     // 20초 타이머
//     useEffect(() => {
//         const timer = setInterval(() => {
//             setTimeLeft((prev) => {
//                 if (prev <= 1) {
//                     handleExit(); // 시간 초과 시 자동 종료
//                     return 0;
//                 }
//                 return prev - 1;
//             });
//         }, 1000);
//
//         return () => clearInterval(timer);
//     }, []);
//
//     // 아이템/재화/작물 데이터
//     const items = [
//         { type: 'CUSTOM_DICE', name: '내맘대로 주사위', price: 100, image: '/images/items/custom_dice.png' },
//         { type: 'PIPE', name: '토관', price: 60, image: '/images/items/pipe.png' },
//         { type: 'GOLD_PIPE', name: '금토관', price: 150, image: '/images/items/gold_pipe.png' },
//         { type: 'GOLD_DICE', name: '금주사위', price: 100, image: '/images/items/gold_dice.png' },
//         { type: 'DOUBLE_DICE', name: '더블주사위', price: 80, image: '/images/items/double_dice.png' },
//         { type: 'MIRROR', name: '거울', price: 70, image: '/images/items/mirror.png' },
//         { type: 'GOLD_MIRROR', name: '금거울', price: 120, image: '/images/items/gold_mirror.png' }
//     ];
//
//     const resources = [
//         { type: 'WOOD', name: '목재', buyPrice: 120, sellPrice: 60, image: '/images/resources/wood.png' },
//         { type: 'IRON', name: '철광석', buyPrice: 80, sellPrice: 40, image: '/images/resources/iron.png' },
//         { type: 'CLOTH', name: '천', buyPrice: 60, sellPrice: 30, image: '/images/resources/cloth.png' },
//         { type: 'BRICK', name: '벽돌', buyPrice: 140, sellPrice: 70, image: '/images/resources/brick.png' },
//         { type: 'WALLPAPER', name: '벽지', buyPrice: 200, sellPrice: 100, image: '/images/resources/wallpaper.png' },
//         { type: 'CLAY', name: '점토', buyPrice: 100, sellPrice: 50, image: '/images/resources/clay.png' },
//         { type: 'FLOOR', name: '바닥', buyPrice: 160, sellPrice: 80, image: '/images/resources/floor.png' }
//     ];
//
//     const harvests = [
//         { type: 'APPLE', name: '사과', price: 80, image: '/images/harvests/apple.png' },
//         { type: 'ORANGE', name: '오렌지', price: 100, image: '/images/harvests/orange.png' },
//         { type: 'PEAR', name: '배', price: 120, image: '/images/harvests/pear.png' },
//         { type: 'PEACH', name: '복숭아', price: 150, image: '/images/harvests/peach.png' },
//         { type: 'CHERRY', name: '체리', price: 200, image: '/images/harvests/cherry.png' },
//         { type: 'FISH_SMALL', name: '작은 물고기', price: 50, image: '/images/harvests/fish_small.png' },
//         { type: 'FISH_MEDIUM', name: '중간 물고기', price: 150, image: '/images/harvests/fish_medium.png' },
//         { type: 'FISH_LARGE', name: '큰 물고기', price: 300, image: '/images/harvests/fish_large.png' }
//     ];
//
//     // 거래 핸들러
//     const handleBuyItem = () => {
//         if (!selectedItem) return;
//
//         stompClient.publish({
//             destination: '/app/shop/buy-item',
//             body: JSON.stringify({
//                 roomId: gameState.roomId,
//                 itemType: selectedItem.type
//             })
//         });
//
//         // 구매 후 선택 해제 (계속 이용 가능)
//         setSelectedItem(null);
//         setQuantity(1);
//     };
//
//     const handleBuyResource = () => {
//         if (!selectedItem || quantity <= 0) return;
//
//         stompClient.publish({
//             destination: '/app/shop/buy-resource',
//             body: JSON.stringify({
//                 roomId: gameState.roomId,
//                 resourceType: selectedItem.type,
//                 quantity: quantity
//             })
//         });
//
//         // 구매 후 선택 해제 (계속 이용 가능)
//         setSelectedItem(null);
//         setQuantity(1);
//     };
//
//     const handleSellResource = () => {
//         if (!selectedItem || quantity <= 0) return;
//
//         stompClient.publish({
//             destination: '/app/shop/sell-resource',
//             body: JSON.stringify({
//                 roomId: gameState.roomId,
//                 resourceType: selectedItem.type,
//                 quantity: quantity
//             })
//         });
//
//         // 판매 후 선택 해제 (계속 이용 가능)
//         setSelectedItem(null);
//         setQuantity(1);
//     };
//
//     const handleSellHarvest = () => {
//         if (!selectedItem || quantity <= 0) return;
//
//         stompClient.publish({
//             destination: '/app/shop/sell-harvest',
//             body: JSON.stringify({
//                 roomId: gameState.roomId,
//                 harvestType: selectedItem.type,
//                 quantity: quantity
//             })
//         });
//
//         // 판매 후 선택 해제 (계속 이용 가능)
//         setSelectedItem(null);
//         setQuantity(1);
//     };
//
//     const handleExit = () => {
//         stompClient.publish({
//             destination: '/app/shop/end',
//             body: JSON.stringify({
//                 roomId: gameState.roomId
//             })
//         });
//     };
//
//     const handleConfirm = () => {
//         if (activeTab === 'buy') {
//             if (isItemShop) {
//                 handleBuyItem();
//             } else {
//                 handleBuyResource();
//             }
//         } else {
//             // 판매
//             if (selectedItem.sellPrice) {
//                 handleSellResource();
//             } else {
//                 handleSellHarvest();
//             }
//         }
//     };
//
//     // 판매 가능한 아이템만 필터링
//     const getOwnedItems = () => {
//         const owned = [];
//
//         // 재화
//         resources.forEach(resource => {
//             const count = myPlayer.resources[resource.type] || 0;
//             if (count > 0) {
//                 owned.push({ ...resource, owned: count, category: 'resource' });
//             }
//         });
//
//         // 작물
//         harvests.forEach(harvest => {
//             const count = myPlayer.harvests[harvest.type] || 0;
//             if (count > 0) {
//                 owned.push({ ...harvest, owned: count, category: 'harvest' });
//             }
//         });
//
//         // 아이템 (판매 불가이므로 제외)
//
//         return owned;
//     };
//
//     return (
//         <div className="shop-page-v3">
//             {/* 헤더 */}
//             <div className="shop-header">
//                 <h2>{isItemShop ? '🎁 아이템 상점' : '🏪 재화 상점'}</h2>
//                 <div className="timer">⏱️ {timeLeft}초</div>
//                 <div className="bell-display">💰 {myPlayer.bell}</div>
//             </div>
//
//             {/* 탭 */}
//             <div className="shop-tabs">
//                 <button
//                     className={activeTab === 'buy' ? 'active' : ''}
//                     onClick={() => { setActiveTab('buy'); setSelectedItem(null); }}
//                 >
//                     구매
//                 </button>
//                 <button
//                     className={activeTab === 'sell' ? 'active' : ''}
//                     onClick={() => { setActiveTab('sell'); setSelectedItem(null); }}
//                 >
//                     판매
//                 </button>
//             </div>
//
//             {/* 상품 그리드 */}
//             <div className="items-grid">
//                 {activeTab === 'buy' ? (
//                     // 구매 탭: 상점 매대
//                     isItemShop ? (
//                         items.map(item => (
//                             <div
//                                 key={item.type}
//                                 className={`item-card ${selectedItem?.type === item.type ? 'selected' : ''}`}
//                                 onClick={() => { setSelectedItem(item); setQuantity(1); }}
//                             >
//                                 <div className="item-image" style={{ backgroundImage: `url(${item.image})` }} />
//                                 <div className="item-name">{item.name}</div>
//                                 <div className="item-price">🔔 {item.price}</div>
//                             </div>
//                         ))
//                     ) : (
//                         resources.map(resource => (
//                             <div
//                                 key={resource.type}
//                                 className={`item-card ${selectedItem?.type === resource.type ? 'selected' : ''}`}
//                                 onClick={() => { setSelectedItem(resource); setQuantity(1); }}
//                             >
//                                 <div className="item-image" style={{ backgroundImage: `url(${resource.image})` }} />
//                                 <div className="item-name">{resource.name}</div>
//                                 <div className="item-price">🔔 {resource.buyPrice}</div>
//                             </div>
//                         ))
//                     )
//                 ) : (
//                     // 판매 탭: 내가 가진 것만
//                     getOwnedItems().map(item => (
//                         <div
//                             key={item.type}
//                             className={`item-card ${selectedItem?.type === item.type ? 'selected' : ''}`}
//                             onClick={() => { setSelectedItem(item); setQuantity(1); }}
//                         >
//                             <div className="item-image" style={{ backgroundImage: `url(${item.image})` }} />
//                             <div className="item-name">{item.name}</div>
//                             <div className="item-price">
//                                 🔔 {item.sellPrice || item.price}
//                             </div>
//                             <div className="item-owned">보유: {item.owned}개</div>
//                         </div>
//                     ))
//                 )}
//             </div>
//
//             {/* 하단 패널 */}
//             <div className="bottom-panel">
//                 {selectedItem ? (
//                     <div className="transaction-panel">
//                         <div className="selected-info">
//                             <strong>{selectedItem.name}</strong> 선택됨
//                         </div>
//
//                         {/* 수량 선택 */}
//                         {(activeTab === 'buy' && !isItemShop) || activeTab === 'sell' ? (
//                             <div className="quantity-selector">
//                                 <button
//                                     onClick={() => setQuantity(Math.max(1, quantity - 1))}
//                                     disabled={quantity <= 1}
//                                 >
//                                     -
//                                 </button>
//                                 <span>
//                   {quantity}
//                                     {activeTab === 'sell' && selectedItem?.owned && (
//                                         <small style={{ fontSize: '14px', color: '#666', marginLeft: '5px' }}>
//                                             / {selectedItem.owned}
//                                         </small>
//                                     )}
//                 </span>
//                                 <button
//                                     onClick={() => setQuantity(quantity + 1)}
//                                     disabled={
//                                         activeTab === 'sell' && selectedItem?.owned && quantity >= selectedItem.owned
//                                     }
//                                 >
//                                     +
//                                 </button>
//                             </div>
//                         ) : null}
//
//                         {/* 아이템 상점 경고 메시지 */}
//                         {activeTab === 'buy' && isItemShop && shopSession?.hasItemPurchased && (
//                             <div className="warning-message">
//                                 ⚠️ 이미 아이템을 구매했습니다
//                             </div>
//                         )}
//
//                         <div className="button-group">
//                             <button
//                                 className="confirm-btn"
//                                 onClick={handleConfirm}
//                                 disabled={
//                                     activeTab === 'buy'
//                                         ? (isItemShop && shopSession?.hasItemPurchased) ||
//                                         myPlayer.bell < (selectedItem.buyPrice || selectedItem.price) * quantity
//                                         : (selectedItem.owned || 0) < quantity
//                                 }
//                             >
//                                 {activeTab === 'buy' ? '구매할래' : '판매할래'}
//                             </button>
//                             <button className="exit-btn" onClick={handleExit}>
//                                 나가기
//                             </button>
//                         </div>
//                     </div>
//                 ) : (
//                     <div className="no-selection">
//                         <p>상품을 선택해주세요</p>
//                         <button className="exit-btn" onClick={handleExit}>
//                             나가기
//                         </button>
//                     </div>
//                 )}
//             </div>
//         </div>
//     );
// };
//
// export default ShopPage;