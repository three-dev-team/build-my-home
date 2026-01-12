package com.buildmyhome.roomlist.controller;

import com.buildmyhome.roomlist.dto.RoomListResponse;
import com.buildmyhome.roomlist.service.RoomListService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
