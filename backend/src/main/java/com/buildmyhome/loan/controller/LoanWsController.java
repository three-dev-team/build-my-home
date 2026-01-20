package com.buildmyhome.loan.controller;

import com.buildmyhome.game.dto.GameMessage;
import com.buildmyhome.game.dto.GameState;
import com.buildmyhome.game.service.GameStateService;
import com.buildmyhome.loan.dto.LoanMessage;
import com.buildmyhome.loan.service.LoanService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.ArrayList;

@Controller
@RequiredArgsConstructor
public class LoanWsController {
    private final SimpMessagingTemplate simpMessagingTemplate;
    private final LoanService loanService;
    private final GameStateService gameStateService;

    /* 대출 실행 */
    @MessageMapping("/loan/borrow")
    public void borrow(LoanMessage message, Principal principal) {
        Long roomId = message.getRoomId();
        Long memberId = Long.parseLong(principal.getName());
        message.setMemberId(memberId); // Principal에서 ID 설정

        try {
            loanService.borrow(message);
            GameState gameState = gameStateService.getGame(roomId);

            GameMessage response = createGameMessage("LOAN_BORROWED", gameState, memberId);
            simpMessagingTemplate.convertAndSend("/topic/games/" + roomId, response);
        } catch (Exception e) {
            sendErrorMessage(roomId, memberId, e.getMessage());
        }
    }

    /* 대출 상환 */
    @MessageMapping("/loan/repay")
    public void repay(LoanMessage message, Principal principal) {
        Long roomId = message.getRoomId();
        Long memberId = Long.parseLong(principal.getName());
        message.setMemberId(memberId);

        try {
            loanService.repay(message);
            GameState gameState = gameStateService.getGame(roomId);

            GameMessage response = createGameMessage("LOAN_REPAID", gameState, memberId);
            simpMessagingTemplate.convertAndSend("/topic/games/" + roomId, response);
        } catch (Exception e) {
            sendErrorMessage(roomId, memberId, e.getMessage());
        }
    }

    /* Helper: GameMessage 생성 (ShopWsController 참조) */
    private GameMessage createGameMessage(String type, GameState gameState, Long memberId) {
        GameMessage response = new GameMessage();
        response.setType(type);
        response.setRoomId(gameState.getRoomId());
        response.setMemberId(memberId);
        response.setStatus(gameState.getStatus().name());
        response.setCurrentPlayerId(gameState.getCurrentPlayerId());
        response.setPlayers(new ArrayList<>(gameState.getPlayers().values()));
        response.setTurnOrder(gameState.getTurnOrder());
        response.setCurrentRound(gameState.getCurrentRound());
        
        // 중요: 타임아웃 정보 포함 (서버 시간 동기화용 - 남은 시간 계산)
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

    /* 에러 메시지 전송 */
    private void sendErrorMessage(Long roomId, Long memberId, String errorMessage) {
        GameMessage errorResponse = new GameMessage();
        errorResponse.setType("LOAN_ERROR");
        errorResponse.setRoomId(roomId);
        errorResponse.setMemberId(memberId);
        errorResponse.setStatus(errorMessage);

        simpMessagingTemplate.convertAndSend("/topic/games/" + roomId, errorResponse);
    }
}
