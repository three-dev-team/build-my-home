package com.buildmyhome.room.dto;

import java.util.List;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RoomMessage {

  private String type; // JOIN, CHARACTER_SELECT, READY ...
  private Long roomId;
  private Long memberId;
  private String nickname;
  private Long characterId;
  private List<RoomPlayerState> players; // 방에 있는 플레이어 목록
}
