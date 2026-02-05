package com.buildmyhome.mupani.service;

import com.buildmyhome.game.dto.GameMessage;
import com.buildmyhome.game.dto.GamePlayerState;
import com.buildmyhome.game.dto.GameState;
import com.buildmyhome.game.dto.GameStatus;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Set;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;

import com.buildmyhome.game.service.GameStateService;
import jakarta.annotation.PreDestroy;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class MupaniServiceImpl implements MupaniService {

    // 무파니 칸 당사자(현재 턴 플레이어) 구매 보너스 수량
    private static final int MUPANI_BONUS = 2;

    // 구매 라운드 + 4 라운드 시작 시점에 무 자동 소멸
    private static final int RADISH_DECAY_OFFSET_ROUND = 4;

    // 전원 결정 완료 후 턴 종료 지연(초)
    private static final int ALL_DECIDED_END_DELAY_SECONDS = 10;

    // roomId -> 무파니 구간 임시 세션(결정 상태/대상 스냅샷) 저장소
    private final ConcurrentHashMap<Long, Session> sessions = new ConcurrentHashMap<>();

    // roomId -> 예약된 종료 작업(중복 예약/취소용)
    private final ConcurrentHashMap<Long, ScheduledFuture<?>> endTurnFutures = new ConcurrentHashMap<>();

    // 종료 예약 스케줄러(서비스 내부)
    private final ScheduledExecutorService scheduler =
            Executors.newScheduledThreadPool(1, r -> {
                Thread t = new Thread(r, "mupani-end-scheduler");
                t.setDaemon(true);
                return t;
            });

    // 게임 토픽 브로드캐스트(STOMP) 송신자
    private final SimpMessagingTemplate template;

    // 턴 전환/게임 상태 조작 서비스
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

    // 무파니 구간 내 "누가 결정을 해야 하는지/했는지"만 추적하는 세션
    private static class Session {

        // 세션 시작 시점 참가자 수(전원 결정 완료 판단 기준)
        volatile int participantCount = 0;

        // 세션 시작 시점 구매 가능 대상(radishQty == 0)
        final Set<Long> eligible = ConcurrentHashMap.newKeySet();

        // 구매/스킵 결정 완료 대상(시작 시점 radish 보유자는 자동 포함)
        final Set<Long> decided = ConcurrentHashMap.newKeySet();

        // 전원 결정 완료 최초 1회만 true로 전환(중복 브로드캐스트 방지)
        final AtomicBoolean allDecidedAnnounced = new AtomicBoolean(false);

        // 세션 스냅샷(eligible/decided/participantCount) 구성 완료 여부
        volatile boolean initialized = false;
    }

    // roomId 기준 세션을 조회하고 없으면 생성
    private Session getOrCreate(Long roomId) {
        return sessions.computeIfAbsent(roomId, (k) -> new Session());
    }

    // 예약 종료 등록(이미 예약돼 있으면 중복 예약 안 함)
    private void scheduleEndTurn(Long roomId, GameState gameState, int delaySeconds) {
        if (roomId == null || gameState == null) return;

        ScheduledFuture<?> existing = endTurnFutures.get(roomId);
        if (existing != null && !existing.isDone() && !existing.isCancelled()) {
            return; // 이미 예약됨
        }

        ScheduledFuture<?> future = scheduler.schedule(() -> {
            try {
                // 10초 뒤에도 아직 무파니 상태면 종료
                if (gameState.getStatus() == GameStatus.WAITING_MUPANI) {
                    endTurnNow(roomId, gameState);
                }
            } finally {
                endTurnFutures.remove(roomId);
            }
        }, delaySeconds, TimeUnit.SECONDS);

        endTurnFutures.put(roomId, future);
    }

    // 예약 종료 취소
    private void cancelScheduledEndTurn(Long roomId) {
        if (roomId == null) return;
        ScheduledFuture<?> f = endTurnFutures.remove(roomId);
        if (f != null) {
            f.cancel(false);
        }
    }

    // 무파니 상태 진입 시: 기존 세션 제거 후 현재 gameState로 스냅샷 재구성
    @Override
    public void startSession(Long roomId, GameState gameState) {
        if (roomId == null || gameState == null) return;
        cancelScheduledEndTurn(roomId);

        sessions.remove(roomId);
        Session s = getOrCreate(roomId);
        initFromGameState(s, gameState);
    }

    // 무파니 구간 종료 시: roomId 세션 정리
    @Override
    public void clearSession(Long roomId) {
        if (roomId == null) return;
        cancelScheduledEndTurn(roomId);

        sessions.remove(roomId);
    }

    // 구매: 검증 -> 비용 차감 -> 수량/소멸라운드 설정 -> 결정완료 -> 전원결정 최초 달성 여부 반환
    @Override
    public MupaniActionResult buy(Long roomId, GameState gameState, Long memberId, int qty) {
        int priceSafe = (gameState != null) ? gameState.getRadishPrice() : 0;

        // 입력 유효성(방/상태/플레이어) 실패 시 즉시 실패 반환
        if (roomId == null || gameState == null || memberId == null) {
            return new MupaniActionResult(new TradeResult("RADISH_BUY_INVALID", 0, 0, priceSafe), false);
        }

        // 무파니 구간(WAITING_MUPANI)에서만 구매 가능
        if (gameState.getStatus() != GameStatus.WAITING_MUPANI) {
            return new MupaniActionResult(new TradeResult("RADISH_BUY_INVALID", 0, 0, gameState.getRadishPrice()), false);
        }

        // 세션이 없거나 미초기화면 현재 gameState 기준으로 1회 스냅샷 구성
        Session s = getOrCreate(roomId);
        ensureInitialized(s, gameState);

        // players는 memberId 키 기반 맵이라고 가정
        GamePlayerState p = gameState.getPlayers().get(memberId);
        if (p == null) {
            return new MupaniActionResult(new TradeResult("RADISH_BUY_INVALID", 0, 0, gameState.getRadishPrice()), false);
        }

        // 이미 구매/스킵 결정한 플레이어는 중복 처리 금지
        if (s.decided.contains(memberId)) {
            return new MupaniActionResult(new TradeResult("RADISH_ALREADY_DECIDED", 0, 0, gameState.getRadishPrice()), false);
        }

        // 세션 시작 시점에 radishQty==0이었던 플레이어만 구매 가능
        if (!s.eligible.contains(memberId)) {
            return new MupaniActionResult(new TradeResult("RADISH_CANNOT_BUY", 0, 0, gameState.getRadishPrice()), false);
        }

        // 방어: 현재 상태에서 이미 무가 있으면 구매 불가 + 결정 완료로만 처리
        if (p.getRadishQty() > 0) {
            s.decided.add(memberId);
            return new MupaniActionResult(new TradeResult("RADISH_CANNOT_BUY", 0, 0, gameState.getRadishPrice()), false);
        }

        // qty는 최소 1로 보정(0/음수 방지)
        int safeQty = Math.max(1, qty);
        int price = gameState.getRadishPrice();
        int cost = price * safeQty;

        // 벨이 부족하면 구매 실패(결정 완료 처리하지 않음)
        if (p.getBell() < cost) {
            return new MupaniActionResult(new TradeResult("RADISH_NOT_ENOUGH_BELL", 0, 0, price), false);
        }

        // 구매 비용 차감
        p.setBell(p.getBell() - cost);

        // 현재 턴 플레이어(무파니 칸 당사자)면 보너스 수량 추가
        int bonus = (gameState.getCurrentPlayerId() != null && memberId.equals(gameState.getCurrentPlayerId()))
                ? MUPANI_BONUS
                : 0;

        // 최종 지급 수량 = 구매수량 + 보너스(해당 시)
        int finalQty = safeQty + bonus;
        p.setRadishQty(finalQty);

        // 무 소멸 라운드 예약(현재 라운드 + 4)
        p.setRadishRemoveRound(gameState.getCurrentRound() + RADISH_DECAY_OFFSET_ROUND);

        // 구매 완료로 결정 처리
        s.decided.add(memberId);

        // 전원 결정 완료가 "처음으로" 달성됐는지 계산
        boolean becameAllDecided = markAllDecidedIfFirst(s);

        // 전원 결정 완료면 10초 뒤 턴 종료 예약
        if (becameAllDecided) {
            scheduleEndTurn(roomId, gameState, ALL_DECIDED_END_DELAY_SECONDS);
        }

        // 벨 변화량은 음수로 기록
        TradeResult tr = new TradeResult("RADISH_BOUGHT", finalQty, -cost, price);
        return new MupaniActionResult(tr, becameAllDecided);
    }

    // 스킵: 결정완료 -> 전원결정 최초 달성 여부 반환(게임 상태/턴은 여기서 변경하지 않음)
    @Override
    public MupaniActionResult skip(Long roomId, GameState gameState, Long memberId) {
        int priceSafe = (gameState != null) ? gameState.getRadishPrice() : 0;

        // 입력 유효성 실패 시 즉시 실패 반환
        if (roomId == null || gameState == null || memberId == null) {
            return new MupaniActionResult(new TradeResult("RADISH_SKIP_INVALID", 0, 0, priceSafe), false);
        }

        // 무파니 구간(WAITING_MUPANI)에서만 스킵 가능
        if (gameState.getStatus() != GameStatus.WAITING_MUPANI) {
            return new MupaniActionResult(new TradeResult("RADISH_SKIP_INVALID", 0, 0, gameState.getRadishPrice()), false);
        }

        // 세션이 없거나 미초기화면 현재 gameState 기준으로 1회 스냅샷 구성
        Session s = getOrCreate(roomId);
        ensureInitialized(s, gameState);

        // 이미 구매/스킵 결정한 플레이어는 중복 처리 금지
        if (s.decided.contains(memberId)) {
            return new MupaniActionResult(new TradeResult("RADISH_ALREADY_DECIDED", 0, 0, gameState.getRadishPrice()), false);
        }

        // 스킵도 결정 완료로 기록
        s.decided.add(memberId);

        // 전원 결정 완료가 "처음으로" 달성됐는지 계산
        boolean becameAllDecided = markAllDecidedIfFirst(s);

        // 전원 결정 완료면 10초 뒤 턴 종료 예약
        if (becameAllDecided) {
            scheduleEndTurn(roomId, gameState, ALL_DECIDED_END_DELAY_SECONDS);
        }

        TradeResult tr = new TradeResult("RADISH_SKIPPED", 0, 0, gameState.getRadishPrice());
        return new MupaniActionResult(tr, becameAllDecided);
    }

    // 판매: 재고 차감 -> 벨 지급 -> 전량 판매 시 소멸 예약(radishRemoveRound) 해제
    @Override
    public TradeResult sell(GameState gameState, Long memberId, int qty) {
        int priceSafe = (gameState != null) ? gameState.getRadishPrice() : 0;

        // 입력 유효성 실패 시 즉시 실패 반환
        if (gameState == null || memberId == null) {
            return new TradeResult("RADISH_SELL_INVALID", 0, 0, priceSafe);
        }

        // players는 memberId 키 기반 맵이라고 가정
        GamePlayerState p = gameState.getPlayers().get(memberId);
        if (p == null) {
            return new TradeResult("RADISH_SELL_INVALID", 0, 0, gameState.getRadishPrice());
        }

        // 보유 수량이 없으면 판매 불가
        int have = p.getRadishQty();
        if (have <= 0) {
            return new TradeResult("RADISH_SELL_NO_RADISH", 0, 0, gameState.getRadishPrice());
        }

        // qty가 0/음수면 입력 오류로 처리
        if (qty <= 0) {
            return new TradeResult("RADISH_SELL_INVALID_QTY", 0, 0, gameState.getRadishPrice());
        }

        // 판매 수량은 보유 수량을 초과하지 않도록 상한 보정
        int safeQty = Math.min(have, qty);
        int price = gameState.getRadishPrice();
        int earned = safeQty * price;

        // 재고 차감
        p.setRadishQty(have - safeQty);

        // 벨 지급
        p.setBell(p.getBell() + earned);

        // 전량 판매 시 소멸 예약 해제
        if (p.getRadishQty() <= 0) {
            p.setRadishRemoveRound(null);
        }

        return new TradeResult("RADISH_SOLD", safeQty, earned, price);
    }

    // 타임아웃 발생 시: 무파니 구간이면 즉시 턴 종료 브로드캐스트
    @Override
    public void onTimeout(Long roomId, GameState gameState) {
        if (roomId == null || gameState == null) return;
        if (gameState.getStatus() != GameStatus.WAITING_MUPANI) return;
        cancelScheduledEndTurn(roomId);
        endTurnNow(roomId, gameState);
    }

    // 즉시 턴 종료: 세션 정리 -> 다음 턴 전환 -> TURN_COMPLETED 브로드캐스트
    @Override
    public void endTurnNow(Long roomId, GameState gameState) {
        if (roomId == null || gameState == null) return;

        // gameState 단위로 동시 종료/전환 충돌 방지
        synchronized (gameState) {
            // 이미 상태가 바뀌었으면 중복 종료 방지
            if (gameState.getStatus() != GameStatus.WAITING_MUPANI) return;
            cancelScheduledEndTurn(roomId);

            // 무파니 세션 정리
            clearSession(roomId);

            // 다음 플레이어로 턴 전환(내부에서 status/updatedAt 등 처리 가정)
            gameStateService.turnToNextPlayer(roomId);

            // TURN_COMPLETED 메시지 구성 후 토픽 전송
            GameMessage endMsg = buildTurnCompletedMessage(gameState);
            template.convertAndSend("/topic/games/" + roomId, endMsg);
        }
    }

    // 세션이 아직 스냅샷 구성 전이면 gameState 기준으로 1회 초기화
    private void ensureInitialized(Session s, GameState gameState) {
        if (s.initialized) return;
        initFromGameState(s, gameState);
    }

    // 세션 스냅샷 구성: participantCount/eligible/decided를 "세션 시작 시점" 기준으로 고정
    private void initFromGameState(Session s, GameState gameState) {
        // 이전 세션 흔적 초기화
        s.eligible.clear();
        s.decided.clear();
        s.allDecidedAnnounced.set(false);

        // gameState/players가 없으면 빈 세션으로 초기화 종료
        if (gameState == null || gameState.getPlayers() == null) {
            s.participantCount = 0;
            s.initialized = true;
            return;
        }

        // 참가자 수는 시작 시점 players size로 고정
        s.participantCount = gameState.getPlayers().size();

        // 시작 시점 radishQty==0이면 구매 가능, 아니면 결정 완료로 간주
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

        // 이후 buy/skip에서는 participantCount/eligible 기준으로만 판정
        s.initialized = true;
    }

    // decided 수가 participantCount에 도달했는지 확인하고, 최초 1회만 true 반환
    private boolean markAllDecidedIfFirst(Session s) {
        if (s.participantCount <= 0) return false;

        boolean allDecided = s.decided.size() >= s.participantCount;
        if (!allDecided) return false;

        return s.allDecidedAnnounced.compareAndSet(false, true);
    }

    // TURN_COMPLETED 메시지 구성: 상태 스냅샷 + 남은 timeoutSeconds 계산
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

        // 정의된 타임아웃에서 경과 시간을 빼서 남은 초로 내려보냄
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
