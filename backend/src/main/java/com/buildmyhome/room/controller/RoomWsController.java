package com.buildmyhome.room.controller;

import com.buildmyhome.member.entity.Member;
import com.buildmyhome.member.repository.MemberRepository;
import com.buildmyhome.room.dto.RoomMessage;
import com.buildmyhome.room.dto.RoomPlayerState;
import com.buildmyhome.room.dto.RoomState;
import com.buildmyhome.room.service.RoomStateService;
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
    private final MemberRepository memberRepository;

    @MessageMapping("/rooms/join")
    public void joinRoom(RoomMessage message) {
        message.setType("PLAYER_JOIN");
        messagingTemplate.convertAndSend("/topic/rooms/" + message.getRoomId(), message);
    }

//    TODO: isHost 처리 추가
    @MessageMapping("/rooms/select-character")
    public void selectCharacter(RoomMessage message, Principal principal) {

        Long memberId = Long.parseLong(principal.getName());
        Member member = memberRepository.findById(memberId).orElseThrow();

        RoomPlayerState player = new RoomPlayerState();
        player.setMemberId(memberId);
        player.setNickname(member.getNickname());
        player.setCharacterId(message.getCharacterId());
        roomStateService.addPlayerToRoom(message.getRoomId(), player);

        // 플레이어 추가 후 캐릭터 선택 메시지 브로드캐스트
        message.setType("CHARACTER_SELECT");
        message.setMemberId(memberId);
        message.setNickname(member.getNickname());
        messagingTemplate.convertAndSend("/topic/rooms/" + message.getRoomId(), message);
    }

    @MessageMapping("/rooms/get-players")
    public void getPlayers(RoomMessage message){
        // 현재 메시지에 roomId만 존재
        // 선택된 roomId에 담긴 룸 정보 가져오기
        RoomState room = roomStateService.getRoom(message.getRoomId());
        message.setType("ROOM_STATE");
        if(room != null){
            message.setPlayers(room.getPlayers().values().stream().toList());
        }else{
            message.setPlayers(new ArrayList<>());
        }
        messagingTemplate.convertAndSend("/topic/rooms/" + message.getRoomId(), message);
    }

    @MessageMapping("/rooms/leave")
    public void leaveRoom(RoomMessage message, Principal principal) {
        Long memberId = Long.parseLong(principal.getName());
        RoomState room = roomStateService.getRoom(message.getRoomId());
        if(room != null){
            RoomPlayerState player = room.getPlayer(memberId);
            if(player != null){
                message.setMemberId(memberId);
                message.setNickname(player.getNickname());
                message.setCharacterId(player.getCharacterId());
            }
        }

        roomStateService.removePlayerFromRoom(message.getRoomId(), memberId);
        message.setType("PLAYER_LEAVE");
        messagingTemplate.convertAndSend("/topic/rooms/" + message.getRoomId(), message);
    }

    @MessageMapping("/rooms/ready")
    public void toggleReady(RoomMessage message, Principal principal) {
        // roomId(message), memberId(principal)
        Long memberId = Long.parseLong(principal.getName());
        RoomState room = roomStateService.getRoom(message.getRoomId());
        if( room != null) {
            RoomPlayerState player = room.getPlayer(memberId);
            if (player != null) {
                player.setReady(!player.isReady()); // 서버메모리에 저장
                message.setIsReady(player.isReady()); // websocket용 메시지에 저장
            }
        }
        message.setType("PLAYER_READY");
        message.setMemberId(memberId);
        messagingTemplate.convertAndSend("/topic/rooms/" + message.getRoomId(), message);
    }

}





























