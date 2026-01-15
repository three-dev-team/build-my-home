package com.buildmyhome.room.service;

import com.buildmyhome.room.dto.RoomPlayerState;
import com.buildmyhome.room.dto.RoomState;

import java.util.Map;

public interface RoomStateService {
    void addPlayerToRoom(Long roomId, RoomPlayerState player);

    RoomState getRoom(Long roomId);

    void removePlayerFromRoom(Long roomId, Long memberId);

    void removeRoom(Long roomId);

    Map<Long, RoomState> getAllRoomStates();

    void createRoom(Long roomId, int totalRounds);
}
