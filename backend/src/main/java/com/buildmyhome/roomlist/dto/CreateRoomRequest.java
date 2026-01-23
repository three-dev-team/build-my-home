package com.buildmyhome.roomlist.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class CreateRoomRequest {

  private String title;
  private Integer maxPlayers;
  private Integer totalRounds;
  private String clientRequestId; // 방 생성 요청을 구분하기 위한 식별자
}
