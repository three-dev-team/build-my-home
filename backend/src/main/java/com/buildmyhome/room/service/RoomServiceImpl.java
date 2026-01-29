package com.buildmyhome.room.service;

import com.buildmyhome.room.dto.RoomResponse;
import com.buildmyhome.room.entity.Room;
import com.buildmyhome.room.repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class RoomServiceImpl implements RoomService {

  private final RoomRepository roomRepository;

  @Override
  public RoomResponse getRoom(Long roomId) {
    Room room = roomRepository.findById(roomId).orElseThrow(() -> new RuntimeException("Room not found"));
    return RoomResponse.fromEntity(room);
  }
}
