export const leaveRoom = (stompClient, roomId, memberId) => {
    if (stompClient) {
        stompClient.publish({
            destination: '/app/rooms/leave',
            body: JSON.stringify({ roomId, memberId })
        });
    }
};