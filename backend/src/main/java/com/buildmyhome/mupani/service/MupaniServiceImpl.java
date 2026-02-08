package com.buildmyhome.mupani.service;

import com.buildmyhome.game.dto.GameMessage;
import com.buildmyhome.game.dto.GamePlayerState;
import com.buildmyhome.game.dto.GameState;
import com.buildmyhome.game.dto.GameStatus;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;

import com.buildmyhome.game.service.GameStateService;
import jakarta.annotation.PreDestroy;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class MupaniServiceImpl implements MupaniService {

    // 턴 플레이어 구매 보너스(추가 지급 수량)
    private static final int MUPANI_BONUS = 2;

    // 구매 후 몇 라운드 뒤에 무가 썩는지(삭제 라운드 오프셋)
    private static final int RADISH_DECAY_OFFSET_ROUND = 4;

    // 전원 결정 후, 실제 턴 종료까지 지연 시간
    private static final int ALL_DECIDED_END_DELAY_SECONDS = 7;

    // roomId별 무파니 세션 상태(결정/대상자 추적)
    private final ConcurrentHashMap<Long, Session> sessions = new ConcurrentHashMap<>();

    // roomId별 "전원 결정 후 턴 종료" 예약(중복 예약 방지)
    private final ConcurrentHashMap<Long, ScheduledFuture<?>> endTurnFutures = new ConcurrentHashMap<>();

    // 턴 종료 예약용 스케줄러(단일 스레드)
    private final ScheduledExecutorService scheduler =
            Executors.newScheduledThreadPool(1, r -> {
                Thread t = new Thread(r, "mupani-end-scheduler");
                t.setDaemon(true);
                return t;
            });

    private final SimpMessagingTemplate template;
    private final GameStateService gameStateService;

    public MupaniServiceImpl(SimpMessagingTemplate template, GameStateService gameStateService) {
        this.template = template;
        this.gameStateService = gameStateService;
    }

    @PreDestroy
    public void shutdownScheduler() {
        try {
            scheduler.shutdownNow();
        } catch (Exception ignored) {}
    }

    private static class Session {
        // 실제 참여자(턴오더 기준)
        final Set<Long> participants = ConcurrentHashMap.newKeySet();

        // 구매 가능(무 0개)
        final Set<Long> eligible = ConcurrentHashMap.newKeySet();

        // 구매 불가(이미 무 보유) - decided 아님(알겠어/스킵 눌러야 decided)
        final Set<Long> blocked = ConcurrentHashMap.newKeySet();

        // 버튼으로 '결정'한 사람(구매/스킵/알겠어)
        final Set<Long> decided = ConcurrentHashMap.newKeySet();

        // "전원 결정" 이벤트를 1번만 처리하기 위한 플래그
        final AtomicBoolean allDecidedAnnounced = new AtomicBoolean(false);

        // 세션이 한 번이라도 초기화/갱신됐는지
        volatile boolean initialized = false;
    }

    private Session getOrCreate(Long roomId) {
        return sessions.computeIfAbsent(roomId, (k) -> new Session());
    }

    // 전원 결정 후 delaySeconds 뒤에 턴 종료 예약(중복 예약 방지)
    private void scheduleEndTurn(Long roomId, GameState gameState, int delaySeconds) {
        if (roomId == null || gameState == null) return;

        ScheduledFuture<?> existing = endTurnFutures.get(roomId);
        if (existing != null && !existing.isDone() && !existing.isCancelled()) {
            return;
        }

        ScheduledFuture<?> future = scheduler.schedule(() -> {
            try {
                if (gameState.getStatus() == GameStatus.WAITING_MUPANI) {
                    endTurnNow(roomId, gameState);
                }
            } finally {
                endTurnFutures.remove(roomId);
            }
        }, delaySeconds, TimeUnit.SECONDS);

        endTurnFutures.put(roomId, future);
    }

    private void cancelScheduledEndTurn(Long roomId) {
        if (roomId == null) return;
        ScheduledFuture<?> f = endTurnFutures.remove(roomId);
        if (f != null) f.cancel(false);
    }

    @Override
    public void startSession(Long roomId, GameState gameState) {
        if (roomId == null || gameState == null) return;

        // 이전 예약/세션 초기화 후 새로 시작
        cancelScheduledEndTurn(roomId);
        sessions.remove(roomId);

        Session s = getOrCreate(roomId);

        // 시작 시점에는 participants/eligible/blocked만 세팅하고 decided는 비움
        initOrRefreshFromGameState(s, gameState, true);

        // 무 보유자도 '알겠어'를 눌러야 decided가 되므로 start에서 자동 종료 예약은 하지 않음
    }

    @Override
    public void clearSession(Long roomId) {
        if (roomId == null) return;
        cancelScheduledEndTurn(roomId);
        sessions.remove(roomId);
    }

    @Override
    public MupaniActionResult buy(Long roomId, GameState gameState, Long memberId, int qty) {
        int priceSafe = (gameState != null) ? gameState.getRadishPrice() : 0;

        // 입력/상태 방어
        if (roomId == null || gameState == null || memberId == null) {
            return new MupaniActionResult(new TradeResult("RADISH_BUY_INVALID", 0, 0, priceSafe), false);
        }

        if (gameState.getStatus() != GameStatus.WAITING_MUPANI) {
            return new MupaniActionResult(new TradeResult("RADISH_BUY_INVALID", 0, 0, gameState.getRadishPrice()), false);
        }

        Session s = getOrCreate(roomId);

        // 액션마다 participants/eligible/blocked는 최신화(결정 상태는 유지)
        initOrRefreshFromGameState(s, gameState, false);

        GamePlayerState p = gameState.getPlayers().get(memberId);
        if (p == null) {
            return new MupaniActionResult(new TradeResult("RADISH_BUY_INVALID", 0, 0, gameState.getRadishPrice()), false);
        }

        // 이미 결정한 사람은 중복 처리하지 않고 전원 결정 여부만 체크
        if (s.decided.contains(memberId)) {
            boolean becameAllDecided = markAllDecidedIfFirst(s);
            if (becameAllDecided) scheduleEndTurn(roomId, gameState, ALL_DECIDED_END_DELAY_SECONDS);
            return new MupaniActionResult(new TradeResult("RADISH_ALREADY_DECIDED", 0, 0, gameState.getRadishPrice()), false);
        }

        // 무 보유자는 구매 불가(여기서 decided 처리 X) - 프론트에서 '알겠어' 눌러 skip으로 decided 처리
        if (s.blocked.contains(memberId) || p.getRadishQty() > 0) {
            return new MupaniActionResult(new TradeResult("RADISH_CANNOT_BUY", 0, 0, gameState.getRadishPrice()), false);
        }

        if (!s.eligible.contains(memberId)) {
            return new MupaniActionResult(new TradeResult("RADISH_CANNOT_BUY", 0, 0, gameState.getRadishPrice()), false);
        }

        // 수량/비용 계산
        int safeQty = Math.max(1, qty);
        int price = gameState.getRadishPrice();
        int cost = price * safeQty;

        if (p.getBell() < cost) {
            return new MupaniActionResult(new TradeResult("RADISH_NOT_ENOUGH_BELL", 0, 0, price), false);
        }

        // 결제
        p.setBell(p.getBell() - cost);

        // 턴 플레이어면 보너스 지급
        int bonus = (gameState.getCurrentPlayerId() != null && memberId.equals(gameState.getCurrentPlayerId()))
                ? MUPANI_BONUS : 0;

        int finalQty = safeQty + bonus;
        p.setRadishQty(finalQty);
        p.setRadishRemoveRound(gameState.getCurrentRound() + RADISH_DECAY_OFFSET_ROUND);

        // 구매 확정 -> decided
        s.decided.add(memberId);

        // 전원 결정이면 턴 종료 예약
        boolean becameAllDecided = markAllDecidedIfFirst(s);
        if (becameAllDecided) scheduleEndTurn(roomId, gameState, ALL_DECIDED_END_DELAY_SECONDS);

        TradeResult tr = new TradeResult("RADISH_BOUGHT", finalQty, -cost, price);
        return new MupaniActionResult(tr, becameAllDecided);
    }

    @Override
    public MupaniActionResult skip(Long roomId, GameState gameState, Long memberId) {
        int priceSafe = (gameState != null) ? gameState.getRadishPrice() : 0;

        // 입력/상태 방어
        if (roomId == null || gameState == null || memberId == null) {
            return new MupaniActionResult(new TradeResult("RADISH_SKIP_INVALID", 0, 0, priceSafe), false);
        }

        if (gameState.getStatus() != GameStatus.WAITING_MUPANI) {
            return new MupaniActionResult(new TradeResult("RADISH_SKIP_INVALID", 0, 0, gameState.getRadishPrice()), false);
        }

        Session s = getOrCreate(roomId);

        // 액션마다 participants/eligible/blocked는 최신화(결정 상태는 유지)
        initOrRefreshFromGameState(s, gameState, false);

        // 이미 결정한 사람은 중복 처리하지 않고 전원 결정 여부만 체크
        if (s.decided.contains(memberId)) {
            boolean becameAllDecided = markAllDecidedIfFirst(s);
            if (becameAllDecided) scheduleEndTurn(roomId, gameState, ALL_DECIDED_END_DELAY_SECONDS);
            return new MupaniActionResult(new TradeResult("RADISH_ALREADY_DECIDED", 0, 0, gameState.getRadishPrice()), false);
        }

        // 스킵(= '안살래' 또는 Step5 '알겠어') -> decided
        s.decided.add(memberId);

        boolean becameAllDecided = markAllDecidedIfFirst(s);
        if (becameAllDecided) scheduleEndTurn(roomId, gameState, ALL_DECIDED_END_DELAY_SECONDS);

        TradeResult tr = new TradeResult("RADISH_SKIPPED", 0, 0, gameState.getRadishPrice());
        return new MupaniActionResult(tr, becameAllDecided);
    }

    @Override
    public TradeResult sell(GameState gameState, Long memberId, int qty) {
        int priceSafe = (gameState != null) ? gameState.getRadishPrice() : 0;

        // 입력 방어
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

        if (qty <= 0) {
            return new TradeResult("RADISH_SELL_INVALID_QTY", 0, 0, gameState.getRadishPrice());
        }

        // 보유 수량 범위 내로 클램프
        int safeQty = Math.min(have, qty);
        int price = gameState.getRadishPrice();
        int earned = safeQty * price;

        // 정산(수량 차감 + 벨 추가)
        p.setRadishQty(have - safeQty);
        p.setBell(p.getBell() + earned);

        // 0개가 되면 decay 정보 제거
        if (p.getRadishQty() <= 0) {
            p.setRadishRemoveRound(null);
        }

        return new TradeResult("RADISH_SOLD", safeQty, earned, price);
    }

    @Override
    public void onTimeout(Long roomId, GameState gameState) {
        if (roomId == null || gameState == null) return;
        if (gameState.getStatus() != GameStatus.WAITING_MUPANI) return;
        cancelScheduledEndTurn(roomId);
        endTurnNow(roomId, gameState);
    }

    @Override
    public void endTurnNow(Long roomId, GameState gameState) {
        if (roomId == null || gameState == null) return;

        synchronized (gameState) {
            if (gameState.getStatus() != GameStatus.WAITING_MUPANI) return;

            cancelScheduledEndTurn(roomId);
            clearSession(roomId);

            // 다음 턴으로 넘김
            gameStateService.turnToNextPlayer(roomId);

            // 턴 종료 메시지 브로드캐스트
            GameMessage endMsg = buildTurnCompletedMessage(gameState);
            template.convertAndSend("/topic/games/" + roomId, endMsg);
        }
    }

    /**
     * participants: turnOrder 우선
     * eligible/blocked: players 상태로 계산
     * decided: resetOnStart=true일 때만 초기화
     */
    private void initOrRefreshFromGameState(Session s, GameState gameState, boolean resetOnStart) {
        if (s == null || gameState == null) return;

        // 참여자 목록 구성(turnOrder 우선)
        Set<Long> participantIds = new HashSet<>();
        if (gameState.getTurnOrder() != null && !gameState.getTurnOrder().isEmpty()) {
            for (Long id : gameState.getTurnOrder()) {
                if (id != null) participantIds.add(id);
            }
        } else if (gameState.getPlayers() != null && !gameState.getPlayers().isEmpty()) {
            participantIds.addAll(gameState.getPlayers().keySet());
        }

        if (participantIds.isEmpty()) {
            s.initialized = true;
            return;
        }

        s.participants.clear();
        s.participants.addAll(participantIds);

        s.eligible.clear();
        s.blocked.clear();

        if (resetOnStart) {
            s.decided.clear();
            s.allDecidedAnnounced.set(false);
        }

        // 무 보유 여부로 eligible/blocked 분리
        if (gameState.getPlayers() != null) {
            for (Long pid : participantIds) {
                GamePlayerState p = gameState.getPlayers().get(pid);
                if (p == null) continue;

                if (p.getRadishQty() > 0) {
                    s.blocked.add(pid);
                } else {
                    s.eligible.add(pid);
                }
            }
        }

        s.initialized = true;
    }

    private boolean markAllDecidedIfFirst(Session s) {
        if (s == null) return false;
        if (s.participants.isEmpty()) return false;

        // 전원 decided는 "참여자 전원"이 decided에 들어왔을 때만
        boolean allDecided = s.decided.containsAll(s.participants);
        if (!allDecided) return false;

        // 최초 1회만 true 반환
        return s.allDecidedAnnounced.compareAndSet(false, true);
    }

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

        // statusUpdatedAt 기준으로 남은 타임아웃 초 계산(정의값이 있으면)
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
