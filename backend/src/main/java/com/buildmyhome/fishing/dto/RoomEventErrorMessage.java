package com.buildmyhome.fishing.dto;

import lombok.*;

// 룸 이벤트(=미니게임 이벤트) 채널(/topic/games/{roomId})에서 전달되는 에러 메시지
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoomEventErrorMessage {

    private String type; // "ERROR"
    private Long roomId;
    private String message;
}
