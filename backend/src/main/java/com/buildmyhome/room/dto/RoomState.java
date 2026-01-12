package com.buildmyhome.room.dto;

import lombok.Getter;
import java.util.concurrent.ConcurrentHashMap;
import java.util.Map;

@Getter
public class RoomState {
    private final Long roomId;

    // 접속할 때 쿠키로 로컬로 다운을 받을 수 있으면 좋을 듯
    // Key: memberId Value: RoomPlayerState
    private final Map<Long, RoomPlayerState> players = new ConcurrentHashMap<>();

    public RoomState(Long roomId) {
        this.roomId = roomId;
    }

    public void addPlayer(RoomPlayerState player) {
        players.put(player.getMemberId(), player);
    }

    public void removePlayer(Long memberId) {
        players.remove(memberId);
    }

    public RoomPlayerState getPlayer(Long memberId) {
        return players.get(memberId);
    }
}