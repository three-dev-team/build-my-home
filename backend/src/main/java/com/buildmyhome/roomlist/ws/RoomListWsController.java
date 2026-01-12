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

/*
import com.buildmyhome.member.entity.Member;              // 🔒 로그인 붙이면 추가
import com.buildmyhome.member.repository.MemberRepository;
import java.security.Principal;
*/

@Controller
@RequiredArgsConstructor
public class RoomListWsController {

    private final RoomListService roomListService;
    private final SimpMessagingTemplate messagingTemplate;

    /*
    // 🔒 로그인 붙이면 추가
    private final MemberRepository memberRepository;
    */

    // ❌ 로그인 붙이면 제거
    // 현재는 인증 없이 임시 memberId 사용
    private Long tempMemberId() {
        return 1L;
    }

    /*
    // 🔒 로그인 붙이면 추가
    // WS Principal에서 email 꺼내서 memberId 조회
    private Long memberIdFromPrincipal(Principal principal) {
        if (principal == null || principal.getName() == null) {
            throw new IllegalStateException("인증 정보가 없습니다. (WS CONNECT 헤더에 Authorization 필요)");
        }

        String email = principal.getName();
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("회원 정보를 찾을 수 없습니다."));

        return member.getId();
    }
    */

    private void broadcastSnapshot() {
        RoomsSnapshot snapshot = RoomsSnapshot.builder()
                .type("ROOMS_SNAPSHOT")
                .rooms(roomListService.getRoomList())
                .build();

        messagingTemplate.convertAndSend("/topic/roomlist/rooms", snapshot);
    }

    @MessageMapping("/roomlist/rooms/create")
    public void create(CreateRoomRequest req
            /*
            , Principal principal // 🔒 로그인 붙이면 추가
            */
    ) {
        // ❌ 로그인 붙이면 제거
        Long memberId = tempMemberId();

        /*
        // 🔒 로그인 붙이면 사용
        Long memberId = memberIdFromPrincipal(principal);
        */

        Long roomId = roomListService.createRoom(
                memberId,
                req.getTitle(),
                req.getMaxPlayers(),
                req.getTotalRounds()
        );

        // 프론트가 보낸 clientRequestId를 그대로 돌려줘서 "요청한 사람만" 이동하게 함
        // (인증 아직 없으니 topic으로 뿌리고, 프론트에서 clientRequestId로 매칭)
        // ❌ 로그인 붙이면 제거
        RoomCreatedEvent event = RoomCreatedEvent.builder()
                .type("ROOM_CREATED")
                .clientRequestId(req.getClientRequestId())
                .roomId(roomId)
                .build();

        messagingTemplate.convertAndSend("/topic/roomlist/rooms", event);

        // 🔒 로그인 붙이면 사용
        /*
        RoomCreatedEvent event = RoomCreatedEvent.builder()
                .type("ROOM_CREATED")
                .clientRequestId(req.getClientRequestId()) // (선택) 중복 처리 방지용으로 유지 추천
                .roomId(roomId)
                .build();

        messagingTemplate.convertAndSendToUser(
                principal.getName(),   // 보통 email
                "/queue/roomlist",
                event
        );
        */

        // 방 목록은 모두에게 갱신돼야 하니까 snapshot은 그대로 브로드캐스트 유지
        broadcastSnapshot();
    }

    @MessageMapping("/roomlist/rooms/join")
    public void join(JoinRoomRequest req
            /*
            , Principal principal // 🔒 로그인 붙이면 추가
            */
    ) {
        // ❌ 로그인 붙이면 제거
        Long memberId = tempMemberId();

        /*
        // 🔒 로그인 붙이면 사용
        Long memberId = memberIdFromPrincipal(principal);
        */

        roomListService.joinRoom(memberId, req.getRoomId());
        broadcastSnapshot();
    }

    @MessageMapping("/roomlist/rooms/leave")
    public void leave(LeaveRoomRequest req
            /*
            , Principal principal // 🔒 로그인 붙이면 추가
            */
    ) {
        // ❌ 로그인 붙이면 제거
        Long memberId = tempMemberId();

        /*
        // 🔒 로그인 붙이면 사용
        Long memberId = memberIdFromPrincipal(principal);
        */

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
