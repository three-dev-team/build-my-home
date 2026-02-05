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

  @Override
  public RoomResponse getRoomByInviteCode(String inviteCode) {
    Room room = roomRepository.findByInviteCode(inviteCode)
        .orElseThrow(() -> new RuntimeException("초대 코드가 유효하지 않습니다."));
    return RoomResponse.fromEntity(room);
  }
}
