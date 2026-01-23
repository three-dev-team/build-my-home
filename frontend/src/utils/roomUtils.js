export const leaveRoom = (stompClient, roomId) => {
  if (stompClient) {
    stompClient.publish({
      destination: '/app/rooms/leave',
      body: JSON.stringify({ roomId }),
    });
  }
};
