package com.buildmyhome.room.dto;

import lombok.Getter;
import java.util.concurrent.ConcurrentHashMap;
import java.util.Map;

@Getter
public class RoomState {
    private final Long roomId;
    // TODO : 판수 바꾸는 옵션 추가 (final X)
    private int totalRounds;
    private String hostNickname = "";

    // 접속할 때 쿠키로 로컬로 다운을 받을 수 있으면 좋을 듯
    // Key: memberId Value: RoomPlayerState
    private final Map<Long, RoomPlayerState> players = new ConcurrentHashMap<>();

    public RoomState(Long roomId, int totalRounds) {
        this.roomId = roomId;
        this.totalRounds = totalRounds;
    }

    public void addPlayer(RoomPlayerState player) {
        players.put(player.getMemberId(), player);
        if (player.isHost()) {
            this.hostNickname = player.getNickname();
        }
    }

    public void removePlayer(Long memberId) {
        players.remove(memberId);
    }

    public RoomPlayerState getPlayer(Long memberId) {
        return players.get(memberId);
    }

    public boolean isCharacterSelected(Long characterId) {
        if (characterId == null) return false;

        // 현재 방에 있는 모든 플레이어를 돌면서, 같은 characterId를 가진 사람이 있는지 확인
        return players.values().stream()
                .anyMatch(player -> characterId.equals(player.getCharacterId()));
    }
}