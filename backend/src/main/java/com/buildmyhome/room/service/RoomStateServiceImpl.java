package com.buildmyhome.room.service;

import com.buildmyhome.room.dto.RoomPlayerState;
import com.buildmyhome.room.dto.RoomState;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RoomStateServiceImpl implements RoomStateService {

    // 방 상태 정보를 서버메모리에 저장
    private final Map<Long, RoomState> roomStates = new ConcurrentHashMap<>();

    @Override
    public void addPlayerToRoom(Long roomId, RoomPlayerState player) {
        RoomState room = roomStates.get(roomId);
        if (room == null) {
            throw new IllegalArgumentException("방이 존재하지 않습니다: " + roomId);
        }
        synchronized (room) {
            room.addPlayer(player);
        }
    }

    @Override
    public RoomState getRoom(Long roomId) {
        return roomStates.get(roomId);
    }

    @Override
    public void removePlayerFromRoom(Long roomId, Long memberId) {
        RoomState room = roomStates.get(roomId);
        synchronized (room) {
            room.removePlayer(memberId);
            if (room.getPlayers().isEmpty()) roomStates.remove(roomId);
        }
    }

    @Override
    public void removeRoom(Long roomId) {
        roomStates.remove(roomId);
    }

    @Override
    public Map<Long, RoomState> getAllRoomStates() {
        return new HashMap<>(roomStates);
    }

    @Override
    public void createRoom(Long roomId, int totalRounds) {
        RoomState room = new RoomState(roomId, totalRounds);
        roomStates.put(roomId, room);
    }
}
