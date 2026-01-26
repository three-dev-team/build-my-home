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
  private Long autoStartTime; // 자동 시작 예정 시간
  private Integer maxPlayers; // [NEW] 최대 인원 변경 시 사용
  private List<RoomPlayerState> players; // 방에 있는 플레이어 목록
  private String message; // [NEW] 채팅 메시지 내용
}
