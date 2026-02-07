package com.buildmyhome.common.websocket;

import com.buildmyhome.common.jwt.UserSessionStore;
import java.security.Principal;
import java.util.Map;

import com.buildmyhome.game.controller.GameLeaveController;
import com.buildmyhome.game.dto.GameState;
import com.buildmyhome.game.service.GameStateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketEventListener {

  private final UserSessionStore userSessionStore;
  private final GameStateService gameStateService;
  private final GameLeaveController gameLeaveController;

  @EventListener
  public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
    Principal user = event.getUser(); // 문제되는 멤버 파싱

    if (user != null) {
      try {
        Long memberId = Long.parseLong(user.getName());

        // 중복 로그인 방지용
        // 인증된 사용자라면 세션 스토어에서 제거
        // 해당 유저의 세션 정보 삭제 (탭 닫을 때)
        userSessionStore.removeSession(memberId);
        System.out.println(">>> [WS] Session Removed for Member: " + memberId);

        // 추가: 게임 이탈 처리 (이 멤버가 참여 중인 방 찾기)
        for (Map.Entry<Long, GameState> entry : gameStateService.getAllGames().entrySet()) {
          Long roomId = entry.getKey(); // 방 번호 (33, 45, 72...)
          GameState gameState = entry.getValue(); // 그 방의 게임 데이터

          // 이 방의 플레이어 목록에 끊긴 유저가 있는지 확인
          if (gameState.getPlayers().containsKey(memberId)) {
            log.info(">>> ⚠️ WebSocket 끊김 감지 - memberId: {}, roomId: {}", memberId, roomId);
            gameLeaveController.handlePlayerLeave(roomId, memberId);
            break; // 찾았으니까 더 안 뒤져도 됨 -> 이탈 처리
          }
        }

      } catch (NumberFormatException e) {
        System.err.println(">>> [WS] Failed to parse memberId from Principal: " + user.getName());
      }
    }
  }
}
