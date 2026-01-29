package com.buildmyhome.room.dto;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import lombok.Getter;
import lombok.Setter;

@Getter
public class RoomState {

  private final Long roomId;
  // TODO : 판수 바꾸는 옵션 추가 (final X)
  private int totalRounds;
  
  @Setter
  private int maxPlayers;

  @Setter
  private String hostNickname = "";

  @Setter
  private Long autoStartTime; // 자동 시작 예정 시간 (Server Timestamp)

  // 접속할 때 쿠키로 로컬로 다운을 받을 수 있으면 좋을 듯
  // Key: memberId Value: RoomPlayerState
  private final Map<Long, RoomPlayerState> players = new ConcurrentHashMap<>();

  public RoomState(Long roomId, int totalRounds, int maxPlayers) {
    this.roomId = roomId;
    this.totalRounds = totalRounds;
    this.maxPlayers = maxPlayers;
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
    return players
      .values()
      .stream()
      .anyMatch((player) -> characterId.equals(player.getCharacterId()));
  }
}
