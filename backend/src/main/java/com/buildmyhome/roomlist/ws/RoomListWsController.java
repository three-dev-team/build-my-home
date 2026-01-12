package com.buildmyhome.roomlist.ws;

import com.buildmyhome.roomlist.dto.CreateRoomRequest;
import com.buildmyhome.roomlist.dto.JoinRoomRequest;
import com.buildmyhome.roomlist.dto.LeaveRoomRequest;
import com.buildmyhome.roomlist.dto.RoomCreatedEvent;
import com.buildmyhome.roomlist.dto.RoomsSnapshot;
import com.buildmyhome.roomlist.service.RoomListService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
@RequiredArgsConstructor
public class RoomListWsController {

    private final RoomListService roomListService;
    private final SimpMessagingTemplate messagingTemplate;

    private void broadcastSnapshot() {
        RoomsSnapshot snapshot = RoomsSnapshot.builder()
                .type("ROOMS_SNAPSHOT")
                .rooms(roomListService.getRoomList())
                .build();

        messagingTemplate.convertAndSend("/topic/roomlist/rooms", snapshot);
    }

    private Long memberIdFromPrincipal(Principal principal) {
        if (principal == null || principal.getName() == null) {
            throw new IllegalArgumentException("로그인이 필요합니다.");
        }
        return Long.parseLong(principal.getName());
    }

    @MessageMapping("/roomlist/rooms/create")
    public void create(CreateRoomRequest req, Principal principal) {
        Long memberId = memberIdFromPrincipal(principal);

        Long roomId = roomListService.createRoom(
                memberId,
                req.getTitle(),
                req.getMaxPlayers(),
                req.getTotalRounds()
        );

        RoomCreatedEvent event = RoomCreatedEvent.builder()
                .type("ROOM_CREATED")
                .clientRequestId(req.getClientRequestId())
                .roomId(roomId)
                .build();

        messagingTemplate.convertAndSend("/topic/roomlist/rooms", event);

        broadcastSnapshot();
    }

    @MessageMapping("/roomlist/rooms/join")
    public void join(JoinRoomRequest req, Principal principal) {
        Long memberId = memberIdFromPrincipal(principal);

        roomListService.joinRoom(memberId, req.getRoomId());
        broadcastSnapshot();
    }

    @MessageMapping("/roomlist/rooms/leave")
    public void leave(LeaveRoomRequest req, Principal principal) {
        Long memberId = memberIdFromPrincipal(principal);

        roomListService.leaveRoom(memberId, req.getRoomId());
        broadcastSnapshot();
    }

    @MessageExceptionHandler({IllegalArgumentException.class, IllegalStateException.class})
    public void handleWsException(Exception e) {
        messagingTemplate.convertAndSend("/topic/roomlist/rooms", new Object() {
            public final String type = "ERROR";
            public final String message = e.getMessage();
        });
    }
}
