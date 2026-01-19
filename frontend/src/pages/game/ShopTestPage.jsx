// import { useState } from 'react';
// import ShopPage from './ShopPage';
//
// // 테스트용 Mock 데이터
// const mockGameState = {
//     roomId: 1,
//     status: 'WAITING_SHOP_ITEM',
//     shopSession: {
//         shopSessionId: 'test-123',
//         shopType: 'ITEM_SHOP', // 'ITEM_SHOP' or 'HARVEST_SHOP'
//         playerId: 1,
//         hasItemPurchased: false
//     },
//     players: [
//         {
//             memberId: 1,
//             nickname: '테스트유저',
//             characterId: 1,
//             bell: 1000,
//             resources: {
//                 WOOD: 5,
//                 IRON: 3,
//                 CLOTH: 2,
//                 BRICK: 1,
//                 WALLPAPER: 0,
//                 CLAY: 4,
//                 FLOOR: 0
//             },
//             harvests: {
//                 APPLE: 10,
//                 ORANGE: 5,
//                 PEAR: 3,
//                 PEACH: 2,
//                 CHERRY: 1,
//                 FISH_SMALL: 8,
//                 FISH_MEDIUM: 4,
//                 FISH_LARGE: 2
//             },
//             items: ['PIPE', 'MIRROR']
//         }
//     ]
// };
//
// // Mock StompClient
// const mockStompClient = {
//     publish: ({ destination, body }) => {
//         console.log('📤 메시지 전송:', destination);
//         const parsedBody = JSON.parse(body);
//         console.log('📦 내용:', parsedBody);
//
//         // 간단한 응답 시뮬레이션
//         if (destination === '/app/shop/end') {
//             alert('상점을 나갔습니다! (실제로는 GameState가 업데이트됨)');
//         } else if (destination.includes('buy')) {
//             alert(`구매 완료! ${JSON.stringify(parsedBody)}`);
//         } else if (destination.includes('sell')) {
//             alert(`판매 완료! ${JSON.stringify(parsedBody)}`);
//         }
//     }
// };
//
// // 테스트용 Mock 데이터
// const createMockGameState = () => ({
//     roomId: 1,
//     status: 'WAITING_SHOP_ITEM',
//     shopSession: {
//         shopSessionId: 'test-123',
//         shopType: 'ITEM_SHOP',
//         playerId: 1,
//         hasItemPurchased: false
//     },
//     players: [
//         {
//             memberId: 1,
//             nickname: '테스트유저',
//             characterId: 1,
//             bell: 1000,
//             resources: {
//                 WOOD: 5,
//                 IRON: 3,
//                 CLOTH: 2,
//                 BRICK: 1,
//                 WALLPAPER: 0,
//                 CLAY: 4,
//                 FLOOR: 0
//             },
//             harvests: {
//                 APPLE: 10,
//                 ORANGE: 5,
//                 PEAR: 3,
//                 PEACH: 2,
//                 CHERRY: 1,
//                 FISH_SMALL: 8,
//                 FISH_MEDIUM: 4,
//                 FISH_LARGE: 2
//             },
//             items: ['PIPE', 'MIRROR']
//         }
//     ]
// });
//
// const ShopTestPage = () => {
//     const [gameState, setGameState] = useState(createMockGameState());
//     const [showShop, setShowShop] = useState(false);
//
//     // Mock StompClient - gameState 업데이트 포함
//     const mockStompClient = {
//         publish: ({ destination, body }) => {
//             console.log('📤 메시지 전송:', destination);
//             const parsedBody = JSON.parse(body);
//             console.log('📦 내용:', parsedBody);
//
//             // gameState 업데이트 시뮬레이션
//             if (destination === '/app/shop/buy-item') {
//                 // 아이템 구매 시 hasItemPurchased = true
//                 setGameState(prev => ({
//                     ...prev,
//                     shopSession: {
//                         ...prev.shopSession,
//                         hasItemPurchased: true
//                     }
//                 }));
//                 alert(`아이템 구매 완료! ${parsedBody.itemType}`);
//
//             } else if (destination === '/app/shop/buy-resource') {
//                 // 재화 구매 - 벨 차감, 재화 추가
//                 setGameState(prev => {
//                     const resource = resources.find(r => r.type === parsedBody.resourceType);
//                     const cost = resource.buyPrice * parsedBody.quantity;
//
//                     return {
//                         ...prev,
//                         players: prev.players.map(p => p.memberId === 1 ? {
//                             ...p,
//                             bell: p.bell - cost,
//                             resources: {
//                                 ...p.resources,
//                                 [parsedBody.resourceType]: (p.resources[parsedBody.resourceType] || 0) + parsedBody.quantity
//                             }
//                         } : p)
//                     };
//                 });
//                 alert(`재화 구매 완료! ${parsedBody.resourceType} x${parsedBody.quantity}`);
//
//             } else if (destination === '/app/shop/sell-resource') {
//                 // 재화 판매 - 벨 증가, 재화 감소
//                 setGameState(prev => {
//                     const resource = resources.find(r => r.type === parsedBody.resourceType);
//                     const profit = resource.sellPrice * parsedBody.quantity;
//
//                     return {
//                         ...prev,
//                         players: prev.players.map(p => p.memberId === 1 ? {
//                             ...p,
//                             bell: p.bell + profit,
//                             resources: {
//                                 ...p.resources,
//                                 [parsedBody.resourceType]: (p.resources[parsedBody.resourceType] || 0) - parsedBody.quantity
//                             }
//                         } : p)
//                     };
//                 });
//                 alert(`재화 판매 완료! ${parsedBody.resourceType} x${parsedBody.quantity}`);
//
//             } else if (destination === '/app/shop/sell-harvest') {
//                 // 작물 판매 - 벨 증가, 작물 감소
//                 setGameState(prev => {
//                     const harvest = harvests.find(h => h.type === parsedBody.harvestType);
//                     const profit = harvest.price * parsedBody.quantity;
//
//                     return {
//                         ...prev,
//                         players: prev.players.map(p => p.memberId === 1 ? {
//                             ...p,
//                             bell: p.bell + profit,
//                             harvests: {
//                                 ...p.harvests,
//                                 [parsedBody.harvestType]: (p.harvests[parsedBody.harvestType] || 0) - parsedBody.quantity
//                             }
//                         } : p)
//                     };
//                 });
//                 alert(`작물 판매 완료! ${parsedBody.harvestType} x${parsedBody.quantity}`);
//
//             } else if (destination === '/app/shop/end') {
//                 alert('상점을 나갔습니다! (실제로는 GameState가 업데이트됨)');
//                 setShowShop(false);
//             }
//         }
//     };
//
//     // 재화/작물 데이터 (가격 정보 필요)
//     const resources = [
//         { type: 'WOOD', buyPrice: 120, sellPrice: 60 },
//         { type: 'IRON', buyPrice: 80, sellPrice: 40 },
//         { type: 'CLOTH', buyPrice: 60, sellPrice: 30 },
//         { type: 'BRICK', buyPrice: 140, sellPrice: 70 },
//         { type: 'WALLPAPER', buyPrice: 200, sellPrice: 100 },
//         { type: 'CLAY', buyPrice: 100, sellPrice: 50 },
//         { type: 'FLOOR', buyPrice: 160, sellPrice: 80 }
//     ];
//
//     const harvests = [
//         { type: 'APPLE', price: 80 },
//         { type: 'ORANGE', price: 100 },
//         { type: 'PEAR', price: 120 },
//         { type: 'PEACH', price: 150 },
//         { type: 'CHERRY', price: 200 },
//         { type: 'FISH_SMALL', price: 50 },
//         { type: 'FISH_MEDIUM', price: 150 },
//         { type: 'FISH_LARGE', price: 300 }
//     ];
//
//     // 상점 칸 도착 시뮬레이션
//     const arriveAtShop = (shopType) => {
//         const baseState = createMockGameState();
//         const newState = {
//             ...baseState,
//             status: shopType === 'ITEM_SHOP' ? 'WAITING_SHOP_ITEM' : 'WAITING_SHOP_RESOURCE',
//             shopSession: {
//                 shopSessionId: `test-${Date.now()}`,
//                 shopType: shopType,
//                 playerId: 1,
//                 hasItemPurchased: false // 초기화
//             }
//         };
//         setGameState(newState);
//         setShowShop(true);
//     };
//
//     return (
//         <div>
//             {!showShop ? (
//                 <div style={{
//                     display: 'flex',
//                     flexDirection: 'column',
//                     alignItems: 'center',
//                     justifyContent: 'center',
//                     minHeight: '100vh',
//                     background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
//                 }}>
//                     <h1 style={{ color: 'white', marginBottom: '20px' }}>🧪 상점 테스트 페이지 V3</h1>
//                     <p style={{ color: 'white', marginBottom: '10px', fontSize: '18px' }}>
//                         주사위를 굴려 상점 칸에 도착한 상황을 시뮬레이션
//                     </p>
//                     <p style={{ color: '#e0e0e0', marginBottom: '30px', fontSize: '14px' }}>
//                         (실제 게임에서는 주사위 결과로 자동 진입됨)
//                     </p>
//
//                     <div style={{ display: 'flex', gap: '20px', marginBottom: '50px' }}>
//                         <button
//                             onClick={() => arriveAtShop('ITEM_SHOP')}
//                             style={{
//                                 padding: '20px 40px',
//                                 fontSize: '20px',
//                                 backgroundColor: '#fbbf24',
//                                 color: 'white',
//                                 border: '4px solid #f59e0b',
//                                 borderRadius: '15px',
//                                 cursor: 'pointer',
//                                 fontWeight: 'bold',
//                                 boxShadow: '0 6px 0 #d97706',
//                                 transition: 'all 0.3s'
//                             }}
//                             onMouseOver={(e) => e.target.style.transform = 'translateY(-3px)'}
//                             onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
//                         >
//                             🎲 주사위 → 아이템 상점 칸
//                         </button>
//
//                         <button
//                             onClick={() => arriveAtShop('HARVEST_SHOP')}
//                             style={{
//                                 padding: '20px 40px',
//                                 fontSize: '20px',
//                                 backgroundColor: '#10b981',
//                                 color: 'white',
//                                 border: '4px solid #059669',
//                                 borderRadius: '15px',
//                                 cursor: 'pointer',
//                                 fontWeight: 'bold',
//                                 boxShadow: '0 6px 0 #047857',
//                                 transition: 'all 0.3s'
//                             }}
//                             onMouseOver={(e) => e.target.style.transform = 'translateY(-3px)'}
//                             onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
//                         >
//                             🎲 주사위 → 재화 상점 칸
//                         </button>
//                     </div>
//
//                     <div style={{
//                         padding: '30px',
//                         background: 'white',
//                         borderRadius: '15px',
//                         maxWidth: '600px',
//                         boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)'
//                     }}>
//                         <h3 style={{ marginTop: 0, color: '#333' }}>📊 현재 테스트 상태</h3>
//                         <div style={{ textAlign: 'left', lineHeight: '1.8' }}>
//                             <p><strong>벨:</strong> 1000 🔔</p>
//                             <p><strong>재화:</strong> 목재 5개, 철광석 3개, 천 2개, 벽돌 1개, 점토 4개</p>
//                             <p><strong>작물:</strong> 사과 10개, 오렌지 5개, 배 3개, 복숭아 2개, 체리 1개</p>
//                             <p><strong>물고기:</strong> 작은 물고기 8개, 중간 물고기 4개, 큰 물고기 2개</p>
//                             <p><strong>아이템:</strong> 토관, 거울</p>
//                         </div>
//                     </div>
//
//                     <div style={{
//                         marginTop: '30px',
//                         padding: '20px',
//                         background: 'rgba(255, 255, 255, 0.2)',
//                         borderRadius: '10px',
//                         color: 'white'
//                     }}>
//                         <h4 style={{ margin: '0 0 10px 0' }}>💡 테스트 안내</h4>
//                         <ol style={{ textAlign: 'left', margin: 0 }}>
//                             <li>위 버튼은 "주사위를 굴려 해당 상점 칸에 도착"을 시뮬레이션</li>
//                             <li>실제 게임에서는 주사위 결과로 자동 진입됨</li>
//                             <li>상점 진입 후 [구매] / [판매] 탭 테스트</li>
//                             <li>콘솔(F12)에서 웹소켓 메시지 확인</li>
//                             <li>20초 타이머 동작 확인</li>
//                         </ol>
//                     </div>
//
//                     <button
//                         onClick={() => setShowShop(false)}
//                         style={{
//                             marginTop: '20px',
//                             padding: '10px 30px',
//                             fontSize: '16px',
//                             background: 'rgba(255, 255, 255, 0.3)',
//                             color: 'white',
//                             border: '2px solid white',
//                             borderRadius: '10px',
//                             cursor: 'pointer'
//                         }}
//                     >
//                         ↻ 리셋
//                     </button>
//                 </div>
//             ) : (
//                 <div>
//                     <button
//                         onClick={() => setShowShop(false)}
//                         style={{
//                             position: 'fixed',
//                             top: '10px',
//                             left: '10px',
//                             padding: '10px 20px',
//                             background: '#ef4444',
//                             color: 'white',
//                             border: '3px solid #dc2626',
//                             borderRadius: '10px',
//                             cursor: 'pointer',
//                             fontWeight: 'bold',
//                             zIndex: 9999,
//                             boxShadow: '0 4px 0 #b91c1c'
//                         }}
//                     >
//                         ⬅️ 테스트 페이지로
//                     </button>
//
//                     {/* 실시간 상태 표시 */}
//                     <div style={{
//                         position: 'fixed',
//                         bottom: '10px',
//                         right: '10px',
//                         background: 'rgba(0, 0, 0, 0.8)',
//                         color: 'white',
//                         padding: '15px 20px',
//                         borderRadius: '10px',
//                         zIndex: 9999,
//                         minWidth: '250px',
//                         fontFamily: 'monospace',
//                         fontSize: '14px'
//                     }}>
//                         <div style={{ fontWeight: 'bold', marginBottom: '10px', fontSize: '16px' }}>
//                             📊 실시간 상태
//                         </div>
//                         <div>💰 벨: {gameState.players[0].bell}</div>
//                         <div>🪵 목재: {gameState.players[0].resources.WOOD}개</div>
//                         <div>⛏️ 철광석: {gameState.players[0].resources.IRON}개</div>
//                         <div>🧵 천: {gameState.players[0].resources.CLOTH}개</div>
//                         <div>🍎 사과: {gameState.players[0].harvests.APPLE}개</div>
//                         <div>🍊 오렌지: {gameState.players[0].harvests.ORANGE}개</div>
//                         <div style={{ marginTop: '10px', fontSize: '12px', color: '#aaa' }}>
//                             {gameState.shopSession?.hasItemPurchased ? '✅ 아이템 구매함' : '❌ 아이템 미구매'}
//                         </div>
//                     </div>
//
//                     <ShopPage
//                         gameState={gameState}
//                         stompClient={mockStompClient}
//                         myId={1}
//                     />
//                 </div>
//             )}
//         </div>
//     );
// };
//
// export default ShopTestPage;