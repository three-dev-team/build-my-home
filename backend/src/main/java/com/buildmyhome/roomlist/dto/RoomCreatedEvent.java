package com.buildmyhome.roomlist.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class RoomCreatedEvent {

  private String type; // 메시지 종류 구분용("ROOM_CREATED")
  private String clientRequestId; // 프론트가 보낸 요청 식별자
  private Long roomId; // 서버가 만든 방 id
}
