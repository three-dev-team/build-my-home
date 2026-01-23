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
  public List<RoomListResponse> rooms() {
    return roomListService.getRoomList();
  }
}
