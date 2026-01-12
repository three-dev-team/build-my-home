package com.buildmyhome.room.dto;

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
}