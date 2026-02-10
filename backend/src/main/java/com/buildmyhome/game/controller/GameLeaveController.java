package com.buildmyhome.game.controller;

import com.buildmyhome.common.jwt.JwtTokenProvider;
import com.buildmyhome.game.dto.GamePlayerState;
import com.buildmyhome.game.dto.GameState;
import com.buildmyhome.game.dto.GameStatus;
import com.buildmyhome.game.service.GameStateService;
import com.buildmyhome.room.service.RoomStateService;
import com.buildmyhome.roomlist.service.RoomListService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequiredArgsConstructor
public class GameLeaveController {

    private final GameStateService gameStateService;
    private final SimpMessagingTemplate messagingTemplate;
    private final JwtTokenProvider jwtTokenProvider;
    private final RoomListService roomListService;
    private final RoomStateService roomStateService;

    /**
      sendBeacon 전용 엔드포인트
      sendBeacon은 Authorization 헤더를 못 보내니까
      URL 파라미터로 토큰 받아서 직접 검증
     */
    @PostMapping("/api/games/leave")
    public void leaveByBeacon(
            @RequestBody Map<String, Object> body,
            @RequestParam("token") String token
    ){
        // 토큰 직접 검증
        if (!jwtTokenProvider.validateToken(token)) {
            log.warn(">>> ⚠️ 유효하지 않은 토큰으로 leave 요청");
            return;
        }

        // 멤버 아이디는 토큰에서, 룸 아이디는 서버메모리에서
        Long memberId = jwtTokenProvider.getMemberId(token);
        Long roomId = ((Number) body.get("roomId")).longValue();

        log.info(">>> ⚠️ sendBeacon leave - memberId: {}, roomId: {}", memberId, roomId);
        handlePlayerLeave(roomId, memberId);
    }

    /**
     * 이탈 처리 공통 로직
     * WebSocket leave, sendBeacon, SessionDisconnect 전부 여기로 수렴
     */
    public void handlePlayerLeave(Long roomId, Long memberId) {
        GameState gameState = gameStateService.getGame(roomId);
        if (gameState == null) {
            log.warn(">>> ⚠️ 존재하지 않는 게임 - roomId: {}", roomId);
            return;
        }

        // INTRO/순서결정 중에는 게임 취소 → 전원 room-list 복귀
        if (gameState.getStatus() == GameStatus.INTRO
                || gameState.getStatus() == GameStatus.DETERMINING_ORDER) {
            log.info(">>> ⚠️ 게임 준비 중 이탈 → 게임 취소 - memberId: {}, roomId: {}", memberId, roomId);
            gameStateService.removeGame(roomId);
            roomListService.endGame(roomId);
            roomStateService.removePlayerFromRoom(roomId, memberId);
            messagingTemplate.convertAndSend("/topic/games/" + roomId,
                    Map.of("type", "GAME_CANCELLED", "memberId", memberId));
            return;
        }

        GamePlayerState player = gameState.getPlayers().get(memberId);
        if (player == null) {
            log.warn(">>> ⚠️ 존재하지 않는 플레이어 - memberId: {}", memberId);
            return;
        }

        // 이미 이탈 처리된 경우 중복 방지 (turnOrder에서 이미 제거됐는지로 판단)
        if (player.isDisconnected() && !gameState.getTurnOrder().contains(memberId)) {
            log.info(">>> ⚠️️ 이미 이탈 처리 완료 - memberId: {}", memberId);
            return;
        }

        // 1. 서비스에 이탈 처리 위임
        String result = gameStateService.removePlayerFromGame(roomId, memberId);

        // 2. 이탈한 플레이어 다른 플레이어에게 토스트 (현재 턴 제외 -> player_left jsx에서 별도 처리)
        if ("REMOVED".equals(result)) {
            messagingTemplate.convertAndSend(
                    "/topic/games/" + roomId,
                    Map.of(
                            "type", "PLAYER_DISCONNECTED",
                            "memberId", memberId,
                            "nickname", player.getNickname()
                    )
            );
        }

        // 3. 결과에 따라 gameState 브로드캐스트
        if ("GAME_OVER".equals(result) || "NEXT_TURN".equals(result) || "REMOVED".equals(result)) {
            messagingTemplate.convertAndSend("/topic/games/" + roomId, gameState);
        }
    }
}
