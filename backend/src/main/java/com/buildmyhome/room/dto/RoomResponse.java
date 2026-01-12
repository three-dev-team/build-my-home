package com.buildmyhome.room.dto;

import com.buildmyhome.room.entity.Room;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class RoomResponse {
    private Long id;
    private String title;
    private Integer maxPlayers;
    private Integer currentPlayers;
    private String status;
    private Integer totalRounds;
    private Long hostId;
    private String hostNickname;

    // convert Room entity to RoomResponse DTO
    public static RoomResponse fromEntity(Room room) {
        return RoomResponse.builder()
                .id(room.getId())
                .title(room.getTitle())
                .maxPlayers(room.getMaxPlayers())
                .currentPlayers(room.getCurrentPlayers())
                .status(room.getStatus().name())
                .totalRounds(room.getTotalRounds())
                .hostId(room.getHost().getId())
                .hostNickname(room.getHost().getNickname())
                .build();
    }
}
