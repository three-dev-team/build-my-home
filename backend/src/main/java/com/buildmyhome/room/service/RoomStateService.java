package com.buildmyhome.room.service;

import com.buildmyhome.room.dto.RoomPlayerState;
import com.buildmyhome.room.dto.RoomState;

public interface RoomStateService {
    void addPlayerToRoom(Long roomId, RoomPlayerState player);

    RoomState getRoom(Long roomId);

    void removePlayerFromRoom(Long roomId, Long memberId);
}
