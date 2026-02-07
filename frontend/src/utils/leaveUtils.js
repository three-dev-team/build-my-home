// 방(로비)에서 나갈 때 (WebSocket)
export const leaveRoom = (stompClient, roomId) => {
  if (stompClient) {
    stompClient.publish({
      destination: '/app/rooms/leave',
      body: JSON.stringify({ roomId }),
    });
  }
};

// 게임 이탈: WebSocket으로 leave 보내기 - cleanup 용
export const leaveGame = (stompClient, roomId) => {
  if (stompClient?.active) {
    stompClient.publish({
      destination: '/app/games/leave',
      body: JSON.stringify({ roomId: Number(roomId) }),
    });
  }
};

// 게임 이탈: sendBeacon으로 leave 보내기 (탭 닫기/새로고침용)
export const leaveGameBeacon = (roomId) => {
  const token = sessionStorage.getItem('token');
  if (!token) return;

  const url = `/api/games/leave?token=${encodeURIComponent(token)}`;
  const blob = new Blob(
    [JSON.stringify({ roomId: Number(roomId) })],
    { type: 'application/json' }
  );
  navigator.sendBeacon(url, blob);
};
