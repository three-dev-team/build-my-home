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

import java.util.List;

import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@Controller
@RequiredArgsConstructor
public class GameWsController {
    private final SimpMessagingTemplate simpMessagingTemplate;
    private final RoomStateService roomStateService;
    private final GameStateService gameStateService;

    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);

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
        response.setStatus("INTRO");
        response.setPlayers(new ArrayList<>(gameState.getPlayers().values()));
        simpMessagingTemplate.convertAndSend("/topic/rooms/" + roomId, response);
    }

    @MessageMapping("/games/intro-complete")
    public void introComplete(GameMessage message) {
        Long roomId = message.getRoomId();

        GameState gameState = gameStateService.getGame(roomId);
        if (gameState == null) return;

        gameState.setStatus(GameStatus.DETERMINING_ORDER);

        GameMessage response = new GameMessage();
        response.setType("INTRO_COMPLETE");
        response.setRoomId(roomId);
        response.setStatus("DETERMINING_ORDER");
        response.setPlayers(new ArrayList<>(gameState.getPlayers().values()));

        simpMessagingTemplate.convertAndSend("/topic/games/" + roomId, response);
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


    @MessageMapping("/games/trigger-event")
    public void triggerEvent(GameMessage message) {
        Long roomId = message.getRoomId();
        String requestedStatusStr = message.getStatus(); // 클라이언트가 요청한 상태 (예: WAITING_LOAN)

        GameState gameState = gameStateService.getGame(roomId);
        if (gameState == null) return;

        // 1. 유효한 상태인지 확인 및 변경
        GameStatus targetStatus;
        try {
            targetStatus = GameStatus.valueOf(requestedStatusStr);
        } catch (IllegalArgumentException | NullPointerException e) {
            System.err.println("Invalid status requested: " + requestedStatusStr);
            return;
        }

        gameState.setStatus(targetStatus);
        
        GameMessage startResponse = new GameMessage();
        startResponse.setType("EVENT_START");
        startResponse.setRoomId(roomId);
        startResponse.setStatus(targetStatus.name());
        startResponse.setPlayers(new ArrayList<>(gameState.getPlayers().values()));
        // 추가 필드 설정
        startResponse.setCurrentPlayerId(gameState.getCurrentPlayerId());
        startResponse.setTurnOrder(gameState.getTurnOrder());
        startResponse.setCurrentRound(gameState.getCurrentRound());
        startResponse.setTotalRounds(gameState.getTotalRounds());
        
        simpMessagingTemplate.convertAndSend("/topic/games/" + roomId, startResponse);

        // 2. 20초 후 WAITING_DICE로 복귀하는 스케줄러 실행

        scheduler.schedule(() -> {
            // 게임이 이미 종료됐거나 다른 상태로 변했을 수도 있으니 체크 필요할 수 있음
            // (여기서는 단순하게 강제 복귀 처리)
            gameState.setStatus(GameStatus.WAITING_DICE);

            GameMessage endResponse = new GameMessage();
            endResponse.setType("EVENT_END");
            endResponse.setRoomId(roomId);
            endResponse.setStatus("WAITING_DICE");
            endResponse.setPlayers(new ArrayList<>(gameState.getPlayers().values()));
            // 추가 필드 설정 (복귀 시에도 상태 유지 필요)
            endResponse.setCurrentPlayerId(gameState.getCurrentPlayerId());
            endResponse.setTurnOrder(gameState.getTurnOrder());
            endResponse.setCurrentRound(gameState.getCurrentRound());
            endResponse.setTotalRounds(gameState.getTotalRounds());
            
            System.out.println(">>> ⏰ 20초 경과: MainBoard로 복귀");
            simpMessagingTemplate.convertAndSend("/topic/games/" + roomId, endResponse);
        }, 20, TimeUnit.SECONDS);
    }
}
