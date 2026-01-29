package com.buildmyhome.room.controller;

import com.buildmyhome.room.dto.RoomPlayerState;
import com.buildmyhome.room.dto.RoomResponse;
import com.buildmyhome.room.dto.RoomState;
import com.buildmyhome.room.service.RoomService;
import com.buildmyhome.room.service.RoomStateService;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
public class RoomController {

  private final RoomService roomService;
  private final RoomStateService roomStateService;

  @GetMapping("/{roomId}")
  public ResponseEntity<RoomResponse> getRoom(@PathVariable Long roomId) {
    return ResponseEntity.ok(roomService.getRoom(roomId));
  }

  // 현재 참여 주민 (캐릭터 확인 가능 - 리스트에서)
  @GetMapping("/{roomId}/players")
  public ResponseEntity<List<RoomPlayerState>> getRoomPlayers(@PathVariable Long roomId) {
    RoomState roomState = roomStateService.getRoom(roomId);
    if (roomState == null) {
      return ResponseEntity.ok(List.of());
    }

    List<RoomPlayerState> snapshot;
    synchronized (roomState) {
      snapshot = new ArrayList<>(roomState.getPlayers().values());
    }

    // 모달에서 보기 좋게: 방장 먼저, 그 다음 memberId 오름차순
    snapshot.sort(
      Comparator.comparing(RoomPlayerState::isHost)
        .reversed()
        .thenComparing(RoomPlayerState::getMemberId, Comparator.nullsLast(Long::compareTo))
    );

    return ResponseEntity.ok(snapshot);
  }
}
