package com.buildmyhome.game.controller;

import com.buildmyhome.game.dto.GameMessage;
import com.buildmyhome.game.dto.GamePlayerState;
import com.buildmyhome.game.dto.GameState;
import com.buildmyhome.game.dto.GameStatus;
import com.buildmyhome.game.service.GameStateService;
import com.buildmyhome.room.dto.RoomPlayerState;
import com.buildmyhome.room.dto.RoomState;
import com.buildmyhome.room.service.RoomStateService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;

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

        GameMessage response = new GameMessage();
        response.setType("GAME_START");
        response.setRoomId(roomId);
        response.setStatus("DETERMINING_ORDER");
        response.setPlayers(new ArrayList<>(gameState.getPlayers().values()));
        simpMessagingTemplate.convertAndSend("/topic/rooms/" + roomId, response);
    }

    @MessageMapping("/games/roll-order")
    public void rollForOrder(GameMessage message, Principal principal) {
        Long roomId = message.getRoomId();
        System.out.println(">>> roll-order roomId: " + roomId);
        Long memberId = Long.parseLong(principal.getName());

        GameState gameState = gameStateService.getGame(roomId);
        System.out.println(">>> gameState: " + gameState);

        synchronized (gameState) {
            GamePlayerState player = gameState.getPlayers().get(memberId);
            // 플레이어가 없거나 이미 주사위 굴렸으면 종료
            if (player == null || player.getOrderDiceValue() != null) return;

            // 남은 숫자 중에서 랜덤으로 하나 뽑기 (뽑고 available에서 제거)
            List<Integer> available = gameState.getAvailableDiceNumbers();
            int diceValue = available.remove((int) (Math.random() * available.size()));
            player.setOrderDiceValue(diceValue); // 플레이어 순서용 주사위 값 설정

            // 모든 인원이 다 뽑았는지 체크
            boolean allDone = gameState.getPlayers().values().stream()
                    .allMatch(p -> p.getOrderDiceValue() != null);

            if (allDone) {
                // 높은 숫자 순으로 정렬해서 turnOrder 생성
                List<Long> sortedTurnOrder = gameState.getPlayers().values().stream()
                        .sorted(Comparator.comparing(GamePlayerState::getOrderDiceValue).reversed())
                        .map(GamePlayerState::getMemberId)
                        .toList();

                gameState.setTurnOrder(sortedTurnOrder);
                System.out.println(">>>✅turnOrder: " + sortedTurnOrder);
                gameState.setStatus(GameStatus.WAITING_DICE); // 서버 상태 변경
            }

            GameMessage response = new GameMessage();
            response.setType(allDone ? "ALL_DICE_ROLLED" : "DICE_ROLLED");
            response.setRoomId(roomId);
            response.setMemberId(memberId);
            response.setStatus(gameState.getStatus().name()); // 서버의 최신 상태를 그대로 가져옴
            response.setPlayers(new ArrayList<>(gameState.getPlayers().values()));

            simpMessagingTemplate.convertAndSend("/topic/games/" + roomId, response);
        }

    }
}
