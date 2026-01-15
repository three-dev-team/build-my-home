package com.buildmyhome.game.controller;

import com.buildmyhome.game.dto.GameMessage;
import com.buildmyhome.game.dto.GamePlayerState;
import com.buildmyhome.game.dto.GameState;
import com.buildmyhome.game.service.GameStateService;
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
public class GameWsController {
    private final SimpMessagingTemplate simpMessagingTemplate;
    private final RoomStateService roomStateService;
    private final GameStateService gameStateService;

    @MessageMapping("/games/start")
    public void startGame(GameMessage message) {
        Long roomId = message.getRoomId();
        RoomState room = roomStateService.getRoom(roomId);

        // GameState 생성 -> 게임 관련 모든 데이터가 여기에 저장됨 (현재 몇턴이고, 누가 1등이고, 플레이어 상태가 어떻고 ..)
        GameState gameState = new GameState(roomId, room.getTotalRounds());

        for (RoomPlayerState player : room.getPlayers().values()) {
            gameState.addPlayer(new GamePlayerState(
                    player.getMemberId(),
                    player.getNickname(),
                    player.getCharacterId()
            ));
        }

        gameStateService.saveGame(roomId, gameState);
        System.out.println(">>> players 수: " + gameState.getPlayers().size());

        GameMessage response = new GameMessage();
        response.setType("GAME_START");
        response.setRoomId(roomId);
        response.setStatus("DETERMINING_ORDER");
        response.setPlayers(new ArrayList<>(gameState.getPlayers().values()));
        simpMessagingTemplate.convertAndSend("/topic/rooms/" + roomId, response);
    }
}
