package com.buildmyhome.game.controller;

import com.buildmyhome.common.jwt.JwtTokenProvider;
import com.buildmyhome.game.dto.GamePlayerState;
import com.buildmyhome.game.dto.GameState;
import com.buildmyhome.game.service.GameStateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Map;

@Slf4j
@RestController
@RequiredArgsConstructor
public class GameLeaveController {

    private final GameStateService gameStateService;
    private final SimpMessagingTemplate messagingTemplate;
    private final JwtTokenProvider jwtTokenProvider;

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

        GamePlayerState player = gameState.getPlayers().get(memberId);
        if (player == null) {
            log.warn(">>> ⚠️ 존재하지 않는 플레이어 - memberId: {}", memberId);
            return;
        }

        // 이미 이탈 처리된 경우 중복 방지
        if (player.isDisconnected()) {
            log.info(">>> ⚠️️ 이미 이탈 상태 - memberId: {}", memberId);
            return;
        }

        // 이탈 마킹
        player.setDisconnected(true);
        player.setDisconnectedAt(LocalDateTime.now());

        log.info(">>> ✅ 플레이어 이탈 처리 완료 - memberId: {}, roomId: {}, time: {}",
                memberId, roomId, player.getDisconnectedAt());

        // 다른 플레이어들에게 알림
        messagingTemplate.convertAndSend(
                "/topic/games/" + roomId,
                Map.of(
                        "type", "PLAYER_DISCONNECTED",
                        "memberId", memberId,
                        "nickname", player.getNickname()
                )
        );
    }



}
