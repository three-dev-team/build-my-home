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
        response.setTimeoutSeconds(gameState.getStatus().getTimeoutSeconds());
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

            // 플레이어가 도착한 칸에 맞는 상태로 전환 (예: KK 칸이면 WAITING_KK)
            GameStatus nextStatus = BoardData.getNextStatus(player.getPosition());
            gameState.setStatus(nextStatus);

            // 타임아웃이 설정된 상태라면 스케줄러로 타임아웃 처리 등록
            if (nextStatus.isAutoProceed()){
                scheduler.schedule(() -> {
                    synchronized (gameState) {
                        if (gameState.getStatus() == nextStatus) {

                            // 시간 초과한 경우 다음 플레이어로 넘김
                            gameState.nextTurn();

                            GameMessage timeoutResponse = defaultGameResponse("EVENT_TIMEOUT", gameState);
                            simpMessagingTemplate.convertAndSend("/topic/games/" + roomId, timeoutResponse);
                            System.out.println(">>> ⏰ " + nextStatus.getTimeoutSeconds() + "초 경과: 타임아웃으로 복귀");
                        }
                    }
                }, nextStatus.getTimeoutSeconds(), TimeUnit.SECONDS);
            }

            GameMessage response = defaultGameResponse("MOVE_COMPLETE", gameState);
            simpMessagingTemplate.convertAndSend("/topic/games/" + roomId, response);
        }
    }

    @MessageMapping("/games/action")
    public void handleGameAction(GameMessage message, Principal principal) {
        Long roomId = message.getRoomId();
        String actionType = message.getType(); // 프론트에서 보낸 "LOAN_ACTION", "STAMP_ACTION" 등

        GameState gameState = gameStateService.getGame(roomId);
        if (gameState == null) return;

        synchronized (gameState) {
            // 1. 공통 검증 (현재 턴인지 등)
            Long memberId = Long.parseLong(principal.getName());
            if (!memberId.equals(gameState.getCurrentPlayerId())) return;

            // 2. 타입에 따라 분기 처리
            switch (actionType) {
                case "LOAN_ACTION":
                    // 대출 서비스 호출 혹은 로직 처리
                    // 예: player.setBell(player.getBell() + message.getAmount());
                    break;
                case "STAMP_ACTION":
                    // 스탬프 획득 로직 처리
                    break;
                case "BUY_ITEM":
                    // 아이템 구매 로직 처리
                    break;
            }

            // 3. 결과 전송
            GameMessage response = defaultGameResponse("ACTION_PROCESSED", gameState);
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
            return;
        }

        // 1. 상태 변경 및 전송
        gameState.setStatus(targetStatus);
        GameMessage startResponse = defaultGameResponse("EVENT_START", gameState);
        simpMessagingTemplate.convertAndSend("/topic/games/" + roomId, startResponse);

        // 2. Enum에서 설정한 시간을 가져옴
        int timeout = targetStatus.getTimeoutSeconds();

        // 3. 타임아웃 설정이 있는 상태(0보다 큰 경우)일 때만 스케줄러 실행
        if (timeout > 0) {
            scheduler.schedule(() -> {
                synchronized (gameState) {
                    // 시간이 다 됐을 때 여전히 그 상태일 때만 메인보드 복귀
                    if (gameState.getStatus() == targetStatus) {
                        gameState.setStatus(GameStatus.WAITING_PLAYER_ACTION);
                        GameMessage endResponse = defaultGameResponse("EVENT_END", gameState);
                        simpMessagingTemplate.convertAndSend("/topic/games/" + roomId, endResponse);
                        System.out.println(">>> ⏰ " + timeout + "초 경과: 타임아웃으로 복귀");
                    }
                }
            }, timeout, TimeUnit.SECONDS); // 20 대신 Enum의 값을 사용!
        } else {
            System.out.println(">>> ℹ️ " + targetStatus + " 상태는 제한 시간이 없으므로 스케줄러를 실행하지 않습니다.");
        }
    }
}
