package com.buildmyhome.mupani.service;

import com.buildmyhome.game.dto.GameMessage;
import com.buildmyhome.game.dto.GamePlayerState;
import com.buildmyhome.game.dto.GameState;
import com.buildmyhome.game.dto.GameStatus;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class MupaniServiceImpl implements MupaniService {

  // 무파니 칸 당사자 보너스 수량
  private static final int MUPANI_BONUS = 2;

  // 무 소멸 라운드 오프셋
  // 구매 라운드 + 4 라운드 시작 시점 제거 규칙
  private static final int RADISH_DECAY_OFFSET_ROUND = 4;

  // 방별 무파니 임시 세션 저장소
  private final ConcurrentHashMap<Long, Session> sessions = new ConcurrentHashMap<>();

  // 즉시 턴 종료 브로드캐스트 용도
  private final SimpMessagingTemplate template;

  public MupaniServiceImpl(SimpMessagingTemplate template) {
    this.template = template;
  }

  // 무파니 라운드 내 결정 상태 보관 객체
  private static class Session {

    // 세션 시작 시점 참가자 수 스냅샷
    volatile int participantCount = 0;

    // 세션 시작 시점 구매 가능 대상 고정 집합
    // 시작 시점 radishQty 0인 플레이어 대상
    final Set<Long> eligible = ConcurrentHashMap.newKeySet();

    // 구매 또는 스킵 결정 완료 대상 집합
    // 시작 시점 radish 보유자는 자동 결정 완료 처리
    final Set<Long> decided = ConcurrentHashMap.newKeySet();

    // 전원 결정 완료 최초 달성 1회만 감지 플래그
    final AtomicBoolean allDecidedAnnounced = new AtomicBoolean(false);

    // 세션 초기화 완료 여부
    volatile boolean initialized = false;
  }

  // roomId 기준 세션 조회 또는 생성
  private Session getOrCreate(Long roomId) {
    return sessions.computeIfAbsent(roomId, (k) -> new Session());
  }

  // 무파니 구간 진입 시 세션 초기화 진입점
  @Override
  public void startSession(Long roomId, GameState gameState) {
    if (roomId == null || gameState == null) return;

    sessions.remove(roomId);
    Session s = getOrCreate(roomId);
    initFromGameState(s, gameState);
  }

  // 무파니 구간 종료 시 세션 제거 용도
  @Override
  public void clearSession(Long roomId) {
    if (roomId == null) return;
    sessions.remove(roomId);
  }

  // 구매 처리 엔트리포인트
  // 검증 후 벨 차감 무 수량 반영 소멸 라운드 지정 결정 완료 기록 수행
  @Override
  public MupaniActionResult buy(Long roomId, GameState gameState, Long memberId, int qty) {
    int priceSafe = (gameState != null) ? gameState.getRadishPrice() : 0;

    if (roomId == null || gameState == null || memberId == null) {
      return new MupaniActionResult(new TradeResult("RADISH_BUY_INVALID", 0, 0, priceSafe), false);
    }

    if (gameState.getStatus() != GameStatus.WAITING_MUPANI) {
      return new MupaniActionResult(new TradeResult("RADISH_BUY_INVALID", 0, 0, gameState.getRadishPrice()), false);
    }

    Session s = getOrCreate(roomId);
    ensureInitialized(s, gameState);

    GamePlayerState p = gameState.getPlayers().get(memberId);
    if (p == null) {
      return new MupaniActionResult(new TradeResult("RADISH_BUY_INVALID", 0, 0, gameState.getRadishPrice()), false);
    }

    // 중복 결정 방지 처리
    if (s.decided.contains(memberId)) {
      return new MupaniActionResult(new TradeResult("RADISH_ALREADY_DECIDED", 0, 0, gameState.getRadishPrice()), false);
    }

    // 세션 시작 시점 구매 가능 대상 아닌 경우 차단 처리
    if (!s.eligible.contains(memberId)) {
      return new MupaniActionResult(new TradeResult("RADISH_CANNOT_BUY", 0, 0, gameState.getRadishPrice()), false);
    }

    // 상태 불일치 방어 처리
    if (p.getRadishQty() > 0) {
      s.decided.add(memberId);
      return new MupaniActionResult(new TradeResult("RADISH_CANNOT_BUY", 0, 0, gameState.getRadishPrice()), false);
    }

    int safeQty = Math.max(1, qty);
    int price = gameState.getRadishPrice();
    int cost = price * safeQty;

    // 벨 부족 시 구매 불가 처리
    if (p.getBell() < cost) {
      return new MupaniActionResult(new TradeResult("RADISH_NOT_ENOUGH_BELL", 0, 0, price), false);
    }

    // 구매 비용 차감 처리
    p.setBell(p.getBell() - cost);

    // 무파니 칸 당사자 보너스 적용 처리
    int bonus = (gameState.getCurrentPlayerId() != null && memberId.equals(gameState.getCurrentPlayerId()))
      ? MUPANI_BONUS
      : 0;

    int finalQty = safeQty + bonus;
    p.setRadishQty(finalQty);

    // 소멸 라운드 예약 처리
    p.setRadishRemoveRound(gameState.getCurrentRound() + RADISH_DECAY_OFFSET_ROUND);

    // 결정 완료 기록 처리
    s.decided.add(memberId);

    // 전원 결정 완료 최초 달성 여부 계산 처리
    boolean becameAllDecided = markAllDecidedIfFirst(s);

    TradeResult tr = new TradeResult("RADISH_BOUGHT", finalQty, -cost, price);
    return new MupaniActionResult(tr, becameAllDecided);
  }

  // 스킵 처리 엔트리포인트
  // 결정 완료 기록 후 전원 결정 완료 최초 달성 여부 반환 처리
  @Override
  public MupaniActionResult skip(Long roomId, GameState gameState, Long memberId) {
    int priceSafe = (gameState != null) ? gameState.getRadishPrice() : 0;

    if (roomId == null || gameState == null || memberId == null) {
      return new MupaniActionResult(new TradeResult("RADISH_SKIP_INVALID", 0, 0, priceSafe), false);
    }

    if (gameState.getStatus() != GameStatus.WAITING_MUPANI) {
      return new MupaniActionResult(new TradeResult("RADISH_SKIP_INVALID", 0, 0, gameState.getRadishPrice()), false);
    }

    Session s = getOrCreate(roomId);
    ensureInitialized(s, gameState);

    // 중복 결정 방지 처리
    if (s.decided.contains(memberId)) {
      return new MupaniActionResult(new TradeResult("RADISH_ALREADY_DECIDED", 0, 0, gameState.getRadishPrice()), false);
    }

    // 결정 완료 기록 처리
    s.decided.add(memberId);

    // 전원 결정 완료 최초 달성 여부 계산 처리
    boolean becameAllDecided = markAllDecidedIfFirst(s);

    TradeResult tr = new TradeResult("RADISH_SKIPPED", 0, 0, gameState.getRadishPrice());
    return new MupaniActionResult(tr, becameAllDecided);
  }

  // 판매 처리 엔트리포인트
  // 수량 차감 벨 지급 전량 판매 시 소멸 예약 해제 처리
  @Override
  public TradeResult sell(GameState gameState, Long memberId, int qty) {
    int priceSafe = (gameState != null) ? gameState.getRadishPrice() : 0;

    if (gameState == null || memberId == null) {
      return new TradeResult("RADISH_SELL_INVALID", 0, 0, priceSafe);
    }

    GamePlayerState p = gameState.getPlayers().get(memberId);
    if (p == null) {
      return new TradeResult("RADISH_SELL_INVALID", 0, 0, gameState.getRadishPrice());
    }

    int have = p.getRadishQty();
    if (have <= 0) {
      return new TradeResult("RADISH_SELL_NO_RADISH", 0, 0, gameState.getRadishPrice());
    }

    // 판매 수량 보정 처리
    int safeQty = Math.max(1, Math.min(have, qty));
    int price = gameState.getRadishPrice();
    int earned = safeQty * price;

    // 재고 차감 처리
    p.setRadishQty(have - safeQty);

    // 벨 지급 처리
    p.setBell(p.getBell() + earned);

    // 전량 판매 시 소멸 예약 해제 처리
    if (p.getRadishQty() <= 0) {
      p.setRadishRemoveRound(null);
    }

    return new TradeResult("RADISH_SOLD", safeQty, earned, price);
  }

  // 타임아웃 발생 시 즉시 턴 종료 처리
  @Override
  public void onTimeout(Long roomId, GameState gameState) {
    if (roomId == null || gameState == null) return;
    if (gameState.getStatus() != GameStatus.WAITING_MUPANI) return;

    endTurnNow(roomId, gameState);
  }

  // 즉시 턴 종료 처리
  // 세션 제거 다음 턴 전환 TURN_COMPLETED 브로드캐스트 수행
  @Override
  public void endTurnNow(Long roomId, GameState gameState) {
    if (roomId == null || gameState == null) return;

    synchronized (gameState) {
      // 중복 종료 방지 처리
      if (gameState.getStatus() != GameStatus.WAITING_MUPANI) return;

      clearSession(roomId);
      gameState.nextTurn();

      GameMessage endMsg = buildTurnCompletedMessage(gameState);
      template.convertAndSend("/topic/games/" + roomId, endMsg);
    }
  }

  // 세션 미초기화 상태에서 1회 초기화 수행 처리
  private void ensureInitialized(Session s, GameState gameState) {
    if (s.initialized) return;
    initFromGameState(s, gameState);
  }

  // 세션 스냅샷 구성 처리
  // 참가자 수 구매 가능 대상 기결정 대상 고정 처리
  private void initFromGameState(Session s, GameState gameState) {
    s.eligible.clear();
    s.decided.clear();
    s.allDecidedAnnounced.set(false);

    if (gameState == null || gameState.getPlayers() == null) {
      s.participantCount = 0;
      s.initialized = true;
      return;
    }

    s.participantCount = gameState.getPlayers().size();

    for (GamePlayerState p : gameState.getPlayers().values()) {
      if (p == null) continue;
      Long pid = p.getMemberId();
      if (pid == null) continue;

      if (p.getRadishQty() <= 0) {
        s.eligible.add(pid);
      } else {
        s.decided.add(pid);
      }
    }

    s.initialized = true;
  }

  // 전원 결정 완료 최초 달성 여부 판단 처리
  private boolean markAllDecidedIfFirst(Session s) {
    if (s.participantCount <= 0) return false;

    boolean allDecided = s.decided.size() >= s.participantCount;
    if (!allDecided) return false;

    return s.allDecidedAnnounced.compareAndSet(false, true);
  }

  // TURN_COMPLETED 메시지 구성 처리
  // 상태 스냅샷 포함 남은 타임아웃 계산 포함 처리
  private GameMessage buildTurnCompletedMessage(GameState gameState) {
    GameMessage msg = new GameMessage();
    msg.setType("TURN_COMPLETED");
    msg.setCurrentPlayerId(gameState.getCurrentPlayerId());
    msg.setStatus(gameState.getStatus().name());
    msg.setPlayers(new ArrayList<>(gameState.getPlayers().values()));
    msg.setTurnOrder(gameState.getTurnOrder());
    msg.setCurrentRound(gameState.getCurrentRound());
    msg.setTotalRounds(gameState.getTotalRounds());
    msg.setRadishPrice(gameState.getRadishPrice());

    int definitionTimeout = gameState.getStatus().getTimeoutSeconds();
    if (definitionTimeout > 0 && gameState.getStatusUpdatedAt() != null) {
      long elapsedSeconds = Duration.between(gameState.getStatusUpdatedAt(), LocalDateTime.now()).toSeconds();
      int remainingSeconds = Math.max(0, definitionTimeout - (int) elapsedSeconds);
      msg.setTimeoutSeconds(remainingSeconds);
    } else {
      msg.setTimeoutSeconds(definitionTimeout);
    }

    return msg;
  }
}
