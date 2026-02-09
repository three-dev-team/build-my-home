package com.buildmyhome.common.websocket;

import com.buildmyhome.common.jwt.UserSessionStore;
import java.security.Principal;
import java.util.Map;
import java.util.concurrent.*;

import com.buildmyhome.game.controller.GameLeaveController;
import com.buildmyhome.game.dto.GameMessage;
import com.buildmyhome.game.dto.GameState;
import com.buildmyhome.game.dto.GameStatus;
import com.buildmyhome.game.service.GameStateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketEventListener {

  private final UserSessionStore userSessionStore;
  private final GameStateService gameStateService;
  private final GameLeaveController gameLeaveController;
  private final SimpMessagingTemplate simpMessagingTemplate;

  // 새로고침 이탈 시 유예 처리 위한 타이머(sendBeacon 즉시 처리 -> 서버 유예로 로직 변경)
  private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);
  private final ConcurrentHashMap<Long, ScheduledFuture<?>> pendingLeaves =
      new ConcurrentHashMap<>();

  private static final int LEAVE_DELAY_SECONDS = 5;

  // 재접속 시 유예 타이머 취소
  @EventListener
  public void handleWebSocketConnectListener(SessionConnectEvent event) {
    Principal user = event.getUser();
    if (user == null) return;

    try {
      Long memberId = Long.parseLong(user.getName());

      StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
      String page = accessor.getFirstNativeHeader("page");

      if ("game".equals(page)) {
        ScheduledFuture<?> pending = pendingLeaves.remove(memberId);
        if (pending != null) {
          pending.cancel(false);
          log.info(">>> ✅ 게임 재접속 감지 - 이탈 취소! memberId: {}", memberId);
        }
      }
    } catch (NumberFormatException ignored) {
    }
  }

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

        // 세션 속성에서 페이지 정보 확인
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        Map<String, Object> sessionAttributes = accessor.getSessionAttributes();
        String page = sessionAttributes != null ? (String) sessionAttributes.get("page") : null;

        // 게임 페이지에서 끊긴 경우에만 이탈 처리
        if ("game".equals(page)) {
          // ★ 1단계: 즉시 disconnected 마킹 + 토스트 브로드캐스트
          for (Map.Entry<Long, GameState> entry : gameStateService.getAllGames().entrySet()) {

            Long roomId = entry.getKey();
            GameState gameState = entry.getValue();

            if (gameState.getPlayers().containsKey(memberId)) {

              boolean isPreGame =
                  gameState.getStatus() == GameStatus.INTRO
                      || gameState.getStatus() == GameStatus.DETERMINING_ORDER;

              boolean hasTurnOrder =
                  gameState.getTurnOrder() != null && !gameState.getTurnOrder().isEmpty();

              if (!isPreGame && hasTurnOrder && !gameState.getTurnOrder().contains(memberId)) {
                log.info(">>> ✅ 이미 명시적 leave 처리 완료 - 스킵, memberId: {}", memberId);
                break;
              }

              // 즉시 disconnected 표시
              gameStateService.markDisconnected(roomId, memberId);

              log.info(
                  ">>> ⚠️ 끊김 감지 - {}초 유예 시작, memberId: {}, roomId: {}",
                  LEAVE_DELAY_SECONDS,
                  memberId,
                  roomId);

              // ★ 2단계: 유예 후 진짜 이탈 처리
              final Long targetRoomId = roomId;
              ScheduledFuture<?> future =
                  scheduler.schedule(
                      () -> {
                        pendingLeaves.remove(memberId);

                        // 재접속 했는지 다시 확인
                        GameState gs = gameStateService.getGame(targetRoomId);
                        if (gs == null) return;
                        var player = gs.getPlayers().get(memberId);
                        if (player == null || !player.isDisconnected()) {
                          log.info(">>> ✅ 유예 중 복귀 확인 - 이탈 취소, memberId: {}", memberId);
                          return;
                        }

                        log.info(
                            ">>> ⚠️ 유예 만료 - 이탈 처리 실행! memberId: {}, roomId: {}",
                            memberId,
                            targetRoomId);
                        gameLeaveController.handlePlayerLeave(targetRoomId, memberId);
                      },
                      LEAVE_DELAY_SECONDS,
                      TimeUnit.SECONDS);

              ScheduledFuture<?> prev = pendingLeaves.put(memberId, future);
              if (prev != null) prev.cancel(false);

              break;
            }
          }
        } else {
          log.info(">>> [WS] 게임 외 페이지 DISCONNECT - memberId: {}, page: {}", memberId, page);
        }

      } catch (NumberFormatException e) {
        System.err.println(">>> [WS] Failed to parse memberId from Principal: " + user.getName());
      }
    }
  }
}
