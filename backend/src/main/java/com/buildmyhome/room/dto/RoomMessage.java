package com.buildmyhome.room.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class RoomMessage {
    private String type;      // JOIN, CHARACTER_SELECT, READY ...
    private Long roomId;
    private Long memberId;
    private String nickname;
    private Long characterId;
    // Boolean(객체)은 null 가능하고, boolean(기본)은 null 불가능
    // RoomMessage는 준비 상태 안 보낼 때도 있어서 null 허용
    private Boolean isReady;
    private List<RoomPlayerState> players;  // 방에 있는 플레이어 목록
}
