package com.buildmyhome.room.service;

import com.buildmyhome.room.dto.RoomPlayerState;
import com.buildmyhome.room.dto.RoomState;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RoomStateServiceImpl implements RoomStateService {

    // 방 상태 정보를 서버메모리에 저장
    private final Map<Long, RoomState> roomStates = new ConcurrentHashMap<>();

    @Override
    public void addPlayerToRoom(Long roomId, RoomPlayerState player) {
        RoomState room = roomStates.computeIfAbsent(roomId, RoomState::new);
        room.addPlayer(player);
    }

    @Override
    public RoomState getRoom(Long roomId) {
        return roomStates.get(roomId);
    }

    @Override
    public void removePlayerFromRoom(Long roomId, Long memberId) {
        RoomState room = roomStates.get(roomId);
        if (room != null) {
            room.removePlayer(memberId);
        }
    }
}
