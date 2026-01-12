package com.buildmyhome.room.controller;

import com.buildmyhome.room.dto.RoomMessage;
import com.buildmyhome.room.dto.RoomPlayerState;
import com.buildmyhome.room.dto.RoomState;
import com.buildmyhome.room.service.RoomStateService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.ArrayList;

@Controller
@RequiredArgsConstructor
public class RoomWsController {

    private final SimpMessagingTemplate messagingTemplate;
    private final RoomStateService roomStateService;

    @MessageMapping("/rooms/join")
    public void joinRoom(RoomMessage message) {
        message.setType("PLAYER_JOIN");
        messagingTemplate.convertAndSend("/topic/rooms/" + message.getRoomId(), message);
    }

//    TODO: isHost 처리 추가
    @MessageMapping("/rooms/select-character")
    public void selectCharacter(RoomMessage message) {

        RoomPlayerState player = new RoomPlayerState();
        player.setMemberId(message.getMemberId());
        player.setNickname(message.getNickname());
        player.setCharacterId(message.getCharacterId());
        roomStateService.addPlayerToRoom(message.getRoomId(), player);

        // 플레이어 추가 후 캐릭터 선택 메시지 브로드캐스트
        message.setType("CHARACTER_SELECT");
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
    public void leaveRoom(RoomMessage message){
        RoomState room = roomStateService.getRoom(message.getRoomId());
        if(room != null){
            RoomPlayerState player = room.getPlayer(message.getMemberId());
            if(player != null){
                message.setNickname(player.getNickname());
                message.setCharacterId(player.getCharacterId());
            }
        }

        roomStateService.removePlayerFromRoom(message.getRoomId(), message.getMemberId());
        message.setType("PLAYER_LEAVE");
        messagingTemplate.convertAndSend("/topic/rooms/" + message.getRoomId(), message);
    }

    @MessageMapping("/rooms/ready")
    public void toggleReady(RoomMessage message){
        // roomId, memberId
        RoomState room = roomStateService.getRoom(message.getRoomId());
        if( room != null) {
            RoomPlayerState player = room.getPlayer(message.getMemberId());
            if (player != null) {
                player.setReady(!player.isReady()); // 서버메모리에 저장
                message.setIsReady(player.isReady()); // websocket용 메시지에 저장
            }
        }
        message.setType("PLAYER_READY");
        messagingTemplate.convertAndSend("/topic/rooms/" + message.getRoomId(), message);
    }

}


//public class RoomState {
//    private final Long roomId;
//
//    // Key: memberId Value: RoomPlayerState
//    private final Map<Long, RoomPlayerState> players = new ConcurrentHashMap<>();
//
//    public RoomState(Long roomId) {
//        this.roomId = roomId;
//    }
//
//    public void addPlayer(RoomPlayerState player) {
//        players.put(player.getMemberId(), player);
//    }
//
//    public void removePlayer(Long memberId) {
//        players.remove(memberId);
//    }
//
//    public RoomPlayerState getPlayer(Long memberId) {
//        return players.get(memberId);
//    }
//}

//@Getter
//@Setter
//public class RoomMessage {
//    private String type;      // JOIN, CHARACTER_SELECT, READY ...
//    private Long roomId;
//    private Long memberId;
//    private String nickname;
//    private Long characterId;
//    private List<RoomPlayerState> players;  // 방에 있는 플레이어 목록
//}





























