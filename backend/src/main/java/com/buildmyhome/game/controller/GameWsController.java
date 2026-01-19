package com.buildmyhome.game.controller;

import com.buildmyhome.game.constants.BoardData;
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

import static com.buildmyhome.game.constants.GameConstants.*;

@Controller
@RequiredArgsConstructor
public class GameWsController {
    private final SimpMessagingTemplate simpMessagingTemplate;
    private final RoomStateService roomStateService;
    private final GameStateService gameStateService;
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);

    // 서버메모리 -> 프론트로 전달하는 공통 응답 DTO 생성하는 메서드
    private GameMessage defaultGameResponse(String type, GameState gameState) {
        GameMessage response = new GameMessage();
        response.setType(type);
        response.setStatus(gameState.getStatus().name());
        response.setCurrentPlayerId(gameState.getCurrentPlayerId());
        response.setPlayers(new ArrayList<>(gameState.getPlayers().values()));
        response.setTurnOrder(gameState.getTurnOrder());
        response.setCurrentRound(gameState.getCurrentRound());
        return response;
    }

    @MessageMapping("/games/get-state")
    public void getGameState(GameMessage message) {
        Long roomId = message.getRoomId();
        GameState gameState = gameStateService.getGame(roomId);
        if (gameState == null) return;

        GameMessage response = defaultGameResponse("CURRENT_GAME_STATE", gameState);
        simpMessagingTemplate.convertAndSend("/topic/games/" + roomId, response);
    }

    @MessageMapping("/games/start")
    public void startGame(GameMessage message) {
        Long roomId = message.getRoomId();
        RoomState room = roomStateService.getRoom(roomId);

        // GameState 생성 -> 게임 관련 모든 데이터가 여기에 저장됨 (현재 몇턴이고, 누가 1등이고, 플레이어 상태가 어떻고 ..)
        GameState gameState = new GameState(roomId);
        gameState.setStatus(GameStatus.INTRO);

        for (RoomPlayerState player : room.getPlayers().values()) {
            gameState.addPlayer(new GamePlayerState(
                    player.getMemberId(),
                    player.getNickname(),
                    player.getCharacterId()
            ));
        }
        gameStateService.saveGame(roomId, gameState);

        GameMessage response = defaultGameResponse("GAME_START", gameState);
        simpMessagingTemplate.convertAndSend("/topic/rooms/" + roomId, response);
    }

    @MessageMapping("/games/intro-complete")
    public void introComplete(GameMessage message) {
        Long roomId = message.getRoomId();
        GameState gameState = gameStateService.getGame(roomId);
        if (gameState == null) return;
        gameState.setStatus(GameStatus.DETERMINING_ORDER);

        GameMessage response = defaultGameResponse("INTRO_COMPLETE", gameState);
        simpMessagingTemplate.convertAndSend("/topic/games/" + roomId, response);
    }


    @MessageMapping("/games/roll-order")
    public void rollForOrder(GameMessage message, Principal principal) {
        Long roomId = message.getRoomId();
        Long memberId = Long.parseLong(principal.getName());
        GameState gameState = gameStateService.getGame(roomId);

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
                gameState.setCurrentPlayerId(sortedTurnOrder.get(0));
                gameState.setStatus(GameStatus.WAITING_PLAYER_ACTION); // 서버 상태 변경
            }

            GameMessage response = defaultGameResponse(allDone ? "ALL_DICE_ROLLED" : "DICE_ROLLED", gameState);
            simpMessagingTemplate.convertAndSend("/topic/games/" + roomId, response);
        }
    }

    @MessageMapping("/games/select-dice")
    public void selectDice(GameMessage message, Principal principal) {
        Long roomId = message.getRoomId();
        Long memberId = Long.parseLong(principal.getName());
        GameState gameState = gameStateService.getGame(roomId);

        if (gameState == null) return;

        synchronized (gameState) {
            if (!memberId.equals(gameState.getCurrentPlayerId()) ||
                    gameState.getStatus() != GameStatus.WAITING_PLAYER_ACTION) {
                // 잘못된 턴이거나 상태일 경우 에러 메시지 전송 로직 추가 가능
                return;
            }

            gameState.setStatus(GameStatus.WAITING_DICE);
            simpMessagingTemplate.convertAndSend("/topic/games/" + roomId,
                    defaultGameResponse("DICE_SELECTED", gameState));
        }
    }

    @MessageMapping("/games/roll-dice")
    public void rollDice(GameMessage message, Principal principal){
        Long roomId = message.getRoomId();
        Long memberId = Long.parseLong(principal.getName());
        GameState gameState = gameStateService.getGame(roomId);

        if (gameState == null) return;

        synchronized (gameState) {
            if (!memberId.equals(gameState.getCurrentPlayerId()) ||
                    gameState.getStatus() != GameStatus.WAITING_DICE) {
                // 잘못된 턴이거나 상태일 경우 에러 메시지 전송 로직 추가 가능
                return;
            }

            GamePlayerState player = gameState.getPlayers().get(memberId);
            if (player == null) return;

            // 서버에서 주사위 값 생성
            int diceValue = (int) (Math.random() * DICE_MAX) + DICE_MIN;
            player.setDiceValue(diceValue);

            // TODO : 보드칸 수에 따라 수정 필요
            int newPosition = (player.getPosition() + diceValue) % BOARD_SIZE;
            player.setPosition(newPosition);

            gameState.setStatus(GameStatus.MOVING);

            GameMessage response = defaultGameResponse("DICE_ROLLED", gameState);
            response.setDiceValue(diceValue);
            simpMessagingTemplate.convertAndSend("/topic/games/" + roomId, response);
        }
    }

    @MessageMapping("/games/move-complete")
    public void moveComplete(GameMessage message, Principal principal) {
        Long roomId = message.getRoomId();
        Long memberId = Long.parseLong(principal.getName());
        GameState gameState = gameStateService.getGame(roomId);

        if (gameState == null) return;

        synchronized (gameState) {
            if (!memberId.equals(gameState.getCurrentPlayerId()) ||
                    gameState.getStatus() != GameStatus.MOVING) {
                return;
            }

            GamePlayerState player = gameState.getPlayers().get(memberId);
            if (player == null) return;

            GameStatus nextStatus = BoardData.getNextStatus(player.getPosition());
            gameState.setStatus(nextStatus);

            GameMessage response = defaultGameResponse("MOVE_COMPLETE", gameState);
            simpMessagingTemplate.convertAndSend("/topic/games/" + roomId, response);
        }
    }

    @MessageMapping("/games/event-complete")
    public void eventComplete(GameMessage message, Principal principal) {
        Long roomId = message.getRoomId();
        Long memberId = Long.parseLong(principal.getName());
        GameState gameState = gameStateService.getGame(roomId);

        if (gameState == null) return;

        synchronized (gameState) {
            if (!memberId.equals(gameState.getCurrentPlayerId())) {
                return;
            }

            // TODO: 최대 라운드 도달 시 게임 종료 처리
            gameState.nextTurn();

            GameMessage response = defaultGameResponse("TURN_COMPLETED", gameState);
            simpMessagingTemplate.convertAndSend("/topic/games/" + roomId, response);
        }
    }

    // DEV 용: 특정 이벤트 상태로 강제 진입시키고 20초 후 메인보드로 복귀시키기
    @MessageMapping("/games/trigger-event")
    public void triggerEvent(GameMessage message) {
        Long roomId = message.getRoomId();
        String requestedStatusStr = message.getStatus();

        GameState gameState = gameStateService.getGame(roomId);
        if (gameState == null) return;

        GameStatus targetStatus;
        try {
            targetStatus = GameStatus.valueOf(requestedStatusStr);
        } catch (IllegalArgumentException | NullPointerException e) {
            System.err.println("Invalid status requested: " + requestedStatusStr);
            return;
        }

        gameState.setStatus(targetStatus);

        GameMessage startResponse = defaultGameResponse("EVENT_START", gameState);
        simpMessagingTemplate.convertAndSend("/topic/games/" + roomId, startResponse);

        scheduler.schedule(() -> {
            gameState.setStatus(GameStatus.WAITING_PLAYER_ACTION);

            GameMessage endResponse = defaultGameResponse("EVENT_END", gameState);
            simpMessagingTemplate.convertAndSend("/topic/games/" + roomId, endResponse);

            System.out.println(">>> ⏰ 20초 경과: MainBoard로 복귀");
        }, 20, TimeUnit.SECONDS);
    }
}
