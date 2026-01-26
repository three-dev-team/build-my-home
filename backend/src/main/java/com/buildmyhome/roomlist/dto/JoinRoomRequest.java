package com.buildmyhome.roomlist.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class JoinRoomRequest {

  private Long roomId;
  private String password; // 비밀번호 (Optional)
}
