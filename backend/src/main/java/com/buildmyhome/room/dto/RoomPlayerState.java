package com.buildmyhome.room.dto;

import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RoomPlayerState {

  private Long memberId;
  private String nickname;
  private Long characterId;
  private boolean isReady;
  private boolean isHost;
  private LocalDateTime enteredAt;
  private Integer index; // [NEW] 플레이어 자리 인덱스 (1-based)
}
