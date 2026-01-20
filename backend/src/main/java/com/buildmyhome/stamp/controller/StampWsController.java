package com.buildmyhome.stamp.controller;

import com.buildmyhome.game.dto.GameMessage;
import com.buildmyhome.game.dto.GameState;
import com.buildmyhome.game.service.GameStateService;
import com.buildmyhome.stamp.dto.StampMessage;
import com.buildmyhome.stamp.service.StampService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.ArrayList;

@Controller
@RequiredArgsConstructor
public class StampWsController {

    private final SimpMessagingTemplate simpMessagingTemplate;
    private final StampService stampService;
    private final GameStateService gameStateService;

    // Helper method to create consistent game response with time sync
    private GameMessage createGameMessage(String type, GameState gameState) {
        GameMessage response = new GameMessage();
        response.setType(type);
        response.setStatus(gameState.getStatus().name());
        response.setCurrentPlayerId(gameState.getCurrentPlayerId());
        response.setPlayers(new ArrayList<>(gameState.getPlayers().values()));
        response.setTurnOrder(gameState.getTurnOrder());
        response.setCurrentRound(gameState.getCurrentRound());
        response.setTotalRounds(gameState.getTotalRounds());

        // 타임아웃 계산 로직 (경과 시간 반영) - GameWsController와 동일하게 유지
        int definitionTimeout = gameState.getStatus().getTimeoutSeconds();
        if (definitionTimeout > 0 && gameState.getStatusUpdatedAt() != null) {
            long elapsedSeconds = java.time.Duration.between(gameState.getStatusUpdatedAt(), java.time.LocalDateTime.now()).toSeconds();
            int remainingSeconds = Math.max(0, definitionTimeout - (int) elapsedSeconds);
            response.setTimeoutSeconds(remainingSeconds);
        } else {
            response.setTimeoutSeconds(definitionTimeout);
        }
        return response;
    }

    @MessageMapping("/stamp/acquire")
    public void acquireStamp(StampMessage message, Principal principal) {
        Long roomId = message.getRoomId();
        Long memberId = Long.parseLong(principal.getName());
        message.setMemberId(memberId);

        try {
            // 1. 비즈니스 로직 실행
            stampService.acquireStamp(message);

            // 2. 게임 상태 조회
            GameState gameState = gameStateService.getGame(roomId);
            if (gameState == null) return;

            // 3. 응답 메시지 생성 (STAMP_ACQUIRED)
            GameMessage response = createGameMessage("STAMP_ACQUIRED", gameState);
            
            // 4. 브로드캐스팅
            simpMessagingTemplate.convertAndSend("/topic/games/" + roomId, response);

        } catch (Exception e) {
            GameMessage errorResponse = new GameMessage();
            errorResponse.setType("STAMP_ERROR");
            // 에러 메시지 등을 담을 필드가 필요하다면 GameMessage에 추가 필요. 현재는 로깅만.
            System.err.println("Stamp Error: " + e.getMessage());
            simpMessagingTemplate.convertAndSend("/topic/games/" + roomId, errorResponse);
        }
    }
}
