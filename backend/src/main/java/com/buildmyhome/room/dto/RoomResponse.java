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
  private String status;
  private Integer totalRounds;

  // convert Room entity to RoomResponse DTO
  public static RoomResponse fromEntity(Room room) {
    return RoomResponse.builder()
      .id(room.getId())
      .title(room.getTitle())
      .maxPlayers(room.getMaxPlayers())
      .status(room.getStatus().name())
      .totalRounds(room.getTotalRounds())
      .build();
  }
}
