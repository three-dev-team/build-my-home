package com.buildmyhome.common.jwt;

import java.util.concurrent.ConcurrentHashMap;
import org.springframework.context.annotation.Lazy;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Component
public class UserSessionStore {

  // MemberId -> Token
  private final ConcurrentHashMap<Long, String> activeTokens = new ConcurrentHashMap<>();
  private final SimpMessagingTemplate messagingTemplate;

  public UserSessionStore(@Lazy SimpMessagingTemplate messagingTemplate) {
    this.messagingTemplate = messagingTemplate;
  }

  // 새로운 토큰 등록 (기존 토큰 덮어씌움)
  public void registerToken(Long memberId, String token) {
    activeTokens.put(memberId, token);

    // 실시간 킥 메시지 전송 (해당 유저의 기존 소켓 세션으로 전송됨)
    try {
      System.out.println(">>> [KICK DEBUG] Sending kick message to user: " + memberId);
      messagingTemplate.convertAndSendToUser(String.valueOf(memberId), "/queue/kick", "duplicate-login");
      System.out.println(">>> [KICK DEBUG] Message sent to destination: /user/" + memberId + "/queue/kick");
    } catch (Exception e) {
      // 메시지 전송 실패해도 로그인은 성공시켜야 함
      System.err.println(">>> [KICK ERROR] Kick message failed: " + e.getMessage());
      e.printStackTrace();
    }
  }

  // 토큰이 최신인지 확인
  public boolean isLatestToken(Long memberId, String token) {
    if (memberId == null) return false; // ID가 없으면 유효하지 않음

    String latestToken = activeTokens.get(memberId);
    // 토큰이 없거나(서버 재시작 등), 일치하지 않으면 false
    if (latestToken == null) {
      // 서버 재시작 시 맵이 비어가므로, 일단 토큰이 유효하면(JWT검증 통과했으면) 허용할지, 아니면 엄격하게 막을지 결정 필요.
      // 여기서는 "서버 재시작되면 다 로그아웃" 정책으로 엄격하게 false
      return false;
    }
    return latestToken.equals(token);
  }

  // 로그아웃 시 삭제
  public void removeToken(Long memberId) {
    activeTokens.remove(memberId);
  }

  // ---------------------------------------------------------
  // [1인 1소켓 정책] 웹소켓 세션 관리
  // ---------------------------------------------------------
  // MemberId -> SessionId
  private final ConcurrentHashMap<Long, String> activeSessions = new ConcurrentHashMap<>();

  public void addSession(Long memberId, String sessionId) {
    activeSessions.put(memberId, sessionId);
  }

  public void removeSession(Long memberId) {
    activeSessions.remove(memberId);
  }

  // 해당 유저가 이미 다른소켓에 접속중인지 확인 (현재 접속하려는 세션ID와 비교)
  public boolean isDuplicateConnection(Long memberId, String newSessionId) {
    String currentSessionId = activeSessions.get(memberId);
    // 이미 접속중인 세션이 있고, 그게 지금 들어오려는 놈이 아니라면 -> 중복!
    return currentSessionId != null && !currentSessionId.equals(newSessionId);
  }
}
