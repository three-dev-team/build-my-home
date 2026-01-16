package com.buildmyhome.room.controller;

import com.buildmyhome.member.entity.Member;
import com.buildmyhome.member.repository.MemberRepository;
import com.buildmyhome.room.dto.RoomMessage;
import com.buildmyhome.room.dto.RoomPlayerState;
import com.buildmyhome.room.dto.RoomState;
import com.buildmyhome.room.service.RoomStateService;
import com.buildmyhome.roomlist.dto.RoomsSnapshot;
import com.buildmyhome.roomlist.service.RoomListService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.ArrayList;

@Controller
@RequiredArgsConstructor
public class RoomWsController {

    private final SimpMessagingTemplate messagingTemplate;
    private final RoomStateService roomStateService;
    private final RoomListService roomListService;

    @MessageMapping("/rooms/select-character")
    public void selectCharacter(RoomMessage message, Principal principal) {

        Long memberId = Long.parseLong(principal.getName());
        RoomState room = roomStateService.getRoom(message.getRoomId());

        if (room != null) {
            synchronized (room) {
                // 이미 선택된 캐릭터인지 확인
                if (room.isCharacterSelected(message.getCharacterId())) {
                    return;
                }
                RoomPlayerState player = room.getPlayer(memberId);

                if (player != null) {
                    player.setCharacterId(message.getCharacterId());
                    // 플레이어 추가 후 캐릭터 선택 메시지 브로드캐스트
                    message.setType("CHARACTER_SELECT");
                    message.setMemberId(memberId);

                    message.setPlayers(room.getPlayers().values().stream().toList());

                    messagingTemplate.convertAndSend("/topic/rooms/" + message.getRoomId(), message);
                }
            }
        }
    }

    @MessageMapping("/rooms/get-players")
    public void getPlayers(RoomMessage message) {
        // 현재 메시지에 roomId만 존재
        // 선택된 roomId에 담긴 룸 정보 가져오기
        RoomState room = roomStateService.getRoom(message.getRoomId());
        message.setType("ROOM_STATE");
        if (room != null) {
            message.setPlayers(room.getPlayers().values().stream().toList());
        } else {
            message.setPlayers(new ArrayList<>());
        }
        messagingTemplate.convertAndSend("/topic/rooms/" + message.getRoomId(), message);
    }

    @MessageMapping("/rooms/leave")
    public void leaveRoom(RoomMessage message, Principal principal) {
        Long memberId = Long.parseLong(principal.getName());
        Long roomId = message.getRoomId();
        RoomState room = roomStateService.getRoom(roomId);

        // 삭제하기 전에 플레이어 정보 세팅 (닉네임, 캐릭터 아이디) -> 나중에 개별 브로드캐스트 할 일이 있을 수도 있어서
        // ex 곰돌님 (캐릭터 애플이)이 나갔습니다 메시지 토스트
        if (room != null) {
            RoomPlayerState player = room.getPlayer(memberId);
            if (player != null) {
                message.setMemberId(memberId);
                message.setNickname(player.getNickname());
                message.setCharacterId(player.getCharacterId());
            }
        }

        // 방 나가기 처리
        roomListService.leaveRoom(memberId, message.getRoomId());

        RoomState updatedRoom = roomStateService.getRoom(roomId);
        message.setType("PLAYER_LEAVE");

        if (updatedRoom != null) {
            message.setPlayers(updatedRoom.getPlayers().values().stream().toList());
        } else {
            message.setPlayers(new ArrayList<>());
        }
        messagingTemplate.convertAndSend("/topic/rooms/" + roomId, message);

        // 방 목록 업데이트 브로드캐스트
//        RoomsSnapshot snapshot = RoomsSnapshot.builder()
//                .type("ROOMS_SNAPSHOT")
//                .rooms(roomListService.getRoomList())
//                .build();
//        messagingTemplate.convertAndSend("/topic/roomlist/rooms", snapshot);
    }

    @MessageMapping("/rooms/ready")
    public void toggleReady(RoomMessage message, Principal principal) {
        // roomId(message), memberId(principal)
        Long memberId = Long.parseLong(principal.getName());
        Long roomId = message.getRoomId();
        RoomState room = roomStateService.getRoom(message.getRoomId());
        if (room != null) {
            synchronized (room) {
                RoomPlayerState player = room.getPlayer(memberId);
                if (player != null) {
                    player.setReady(!player.isReady()); // 서버 메모리에 저장
                    message.setType("PLAYER_READY");
                    message.setMemberId(memberId);

                    message.setPlayers(room.getPlayers().values().stream().toList());

                    messagingTemplate.convertAndSend("/topic/rooms/" + roomId, message);
                }
            }
        }
    }

    @MessageMapping("/rooms/delegate-host")
    public void delegateHost(RoomMessage message, Principal principal) {
        Long currentHostId = Long.parseLong(principal.getName());
        Long roomId = message.getRoomId();
        Long newHostId = message.getMemberId(); // 위임받을 대상 ID

        try {
            roomStateService.delegateHost(roomId, currentHostId, newHostId);

            // 변경된 방 상태 브로드캐스트
            RoomState room = roomStateService.getRoom(roomId);
            if (room != null) {
                message.setType("HOST_DELEGATED");
                message.setPlayers(room.getPlayers().values().stream().toList());
                messagingTemplate.convertAndSend("/topic/rooms/" + roomId, message);
            }
        } catch (IllegalStateException e) {
            System.err.println("Delegate failed: " + e.getMessage());
        }
    }
}