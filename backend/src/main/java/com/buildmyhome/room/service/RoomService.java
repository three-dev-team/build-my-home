package com.buildmyhome.room.service;

import com.buildmyhome.room.dto.RoomResponse;

public interface RoomService {
  RoomResponse getRoom(Long roomId);
}
