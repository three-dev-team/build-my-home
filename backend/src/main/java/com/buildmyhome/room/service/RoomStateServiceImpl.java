package com.buildmyhome.room.service;

import com.buildmyhome.room.dto.RoomPlayerState;
import com.buildmyhome.room.dto.RoomState;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

@Service
public class RoomStateServiceImpl implements RoomStateService {

  // 방 상태 정보를 서버메모리에 저장
  private final Map<Long, RoomState> roomStates = new ConcurrentHashMap<>();

  @Override
  public void addPlayerToRoom(Long roomId, RoomPlayerState player) {
    RoomState room = roomStates.get(roomId);
    if (room == null) {
      throw new IllegalArgumentException("방이 존재하지 않습니다: " + roomId);
    }
    synchronized (room) {
      player.setEnteredAt(java.time.LocalDateTime.now()); // 입장 시간 기록
      room.addPlayer(player);
    }
  }

  @Override
  public RoomState getRoom(Long roomId) {
    return roomStates.get(roomId);
  }

  @Override
  public void removePlayerFromRoom(Long roomId, Long memberId) {
    RoomState room = roomStates.get(roomId);
    synchronized (room) {
      RoomPlayerState removingPlayer = room.getPlayer(memberId);
      if (removingPlayer == null)
        return;

      boolean wasHost = removingPlayer.isHost();
      room.removePlayer(memberId);

      if (room.getPlayers().isEmpty()) {
        roomStates.remove(roomId);
      } else if (wasHost) {
        // 방장이 나갔으면 가장 오래된 유저에게 방장 위임
        RoomPlayerState nextHost = room
            .getPlayers()
            .values()
            .stream()
            .min(java.util.Comparator.comparing(RoomPlayerState::getEnteredAt))
            .orElse(null);

        if (nextHost != null) {
          nextHost.setHost(true);
          room.setHostNickname(nextHost.getNickname());
          System.out.println(">>> 👑 New Host: " + nextHost.getNickname());
        }
      }
    }
  }

  @Override
  public void removeRoom(Long roomId) {
    roomStates.remove(roomId);
  }

  @Override
  public Map<Long, RoomState> getAllRoomStates() {
    return new HashMap<>(roomStates);
  }

  @Override
  public void createRoom(Long roomId, int totalRounds, int maxPlayers) {
    RoomState room = new RoomState(roomId, totalRounds, maxPlayers);
    roomStates.put(roomId, room);
  }

  @Override
  public void delegateHost(Long roomId, Long currentHostId, Long newHostId) {
    RoomState room = roomStates.get(roomId);
    if (room == null)
      return;

    synchronized (room) {
      RoomPlayerState currentHost = room.getPlayer(currentHostId);
      RoomPlayerState newHost = room.getPlayer(newHostId);

      if (currentHost == null || newHost == null)
        return;

      // 권한 검증: 요청자가 진짜 방장인지 확인
      if (!currentHost.isHost()) {
        throw new IllegalStateException("방장 위임 권한이 없습니다.");
      }

      // 위임 처리
      currentHost.setHost(false);
      newHost.setHost(true);
      room.setHostNickname(newHost.getNickname());

      System.out.println(">>> 👑 Host Delegated: " + currentHost.getNickname() + " -> " + newHost.getNickname());
    }
  }

  @Override
  public void resetReadyStatus(Long roomId) {
    RoomState room = roomStates.get(roomId);
    if (room == null)
      return;

    synchronized (room) {
      room.setAutoStartTime(null); // 타이머 리셋
      for (RoomPlayerState player : room.getPlayers().values()) {
        player.setReady(false);
      }
    }
  }
}
