package com.buildmyhome.roomlist.controller;

import com.buildmyhome.roomlist.dto.RoomListResponse;
import com.buildmyhome.roomlist.service.RoomListService;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/roomlists")
public class RoomListController {

  private final RoomListService roomListService;

  @GetMapping("/rooms")
  public List<RoomListResponse> rooms(@RequestParam(required = false) String keyword) {
    return roomListService.getRoomList(keyword);
  }

  @PostMapping("/rooms/{roomId}/verify")
  public void verifyPassword(@PathVariable Long roomId, @RequestBody java.util.Map<String, String> body) {
    String password = body.get("password");
    boolean match = roomListService.verifyPassword(roomId, password);
    if (!match) {
      throw new IllegalArgumentException("비밀번호가 일치하지 않습니다.");
    }
  }
}
