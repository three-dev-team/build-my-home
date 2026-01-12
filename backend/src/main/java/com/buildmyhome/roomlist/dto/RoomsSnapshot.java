package com.buildmyhome.roomlist.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class RoomsSnapshot {
    private String type; // 메시지 종류 구분용("ROOMS_SNAPSHOT")
    private List<RoomListResponse> rooms;
}
