package com.buildmyhome.fishing.service;

import com.buildmyhome.fishing.dto.FishingEventMessage;
import com.buildmyhome.fishing.handler.FishingHandler;
import com.buildmyhome.fishing.model.FishingSession;
import com.buildmyhome.fishing.policy.FishingPolicy;
import com.buildmyhome.game.dto.GameMessage;
import com.buildmyhome.game.dto.GamePlayerState;
import com.buildmyhome.game.dto.GameState;
import com.buildmyhome.game.dto.GameStatus;
import com.buildmyhome.game.dto.HarvestType;
import com.buildmyhome.game.dto.ShopItemType;
import com.buildmyhome.game.service.GameStateService;
import jakarta.annotation.PreDestroy;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class FishingService {

    private static final long START_DELAY_MIN_MS = 200L;
    private static final long START_DELAY_MAX_MS = 400L;

    private static final long DURATION_SMALL_MS = 6000L;
    private static final long DURATION_MEDIUM_MS = 8000L;
    private static final long DURATION_LARGE_MS = 10000L;
    private static final long DURATION_RARE_MS = 10000L;

    private static final long TURN_END_AUTO_ADVANCE_MS = 5000L;
    private static final long WAITING_START_TIMEOUT_MS = 10000L;

    private final SimpMessagingTemplate messagingTemplate;
    private final GameStateService gameStateService;
    private final FishingHandler fishingHandler;

    private final ConcurrentHashMap<Long, FishingEventSession> sessions = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<Long, ScheduledFuture<?>> waitingTimeouts = new ConcurrentHashMap<>();

    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);

    @PreDestroy
    public void shutdown() {
        // 진행 중 낚시 세션 타임아웃 취소
        for (FishingEventSession s : sessions.values()) {
            if (s != null && s.timeoutFuture != null) {
                s.timeoutFuture.cancel(false);
            }
        }
        sessions.clear();

        // WAITING_FISHING 대기 타임아웃 취소
        for (ScheduledFuture<?> f : waitingTimeouts.values()) {
            if (f != null) f.cancel(false);
        }
        waitingTimeouts.clear();

        scheduler.shutdownNow();
    }

    // WAITING_FISHING: 시작 안 누르면 자동 실패 처리
    public void scheduleWaitingTimeout(Long roomId, Long actorId) {
        Objects.requireNonNull(roomId, "roomId is required");
        Objects.requireNonNull(actorId, "actorId is required");

        cancelWaitingTimeout(roomId);

        ScheduledFuture<?> future = scheduler.schedule(
                () -> onWaitingStartTimeout(roomId, actorId),
                WAITING_START_TIMEOUT_MS,
                TimeUnit.MILLISECONDS
        );

        waitingTimeouts.put(roomId, future);
    }

    // startFishing 요청 들어오면 호출
    public void cancelWaitingTimeout(Long roomId) {
        if (roomId == null) return;
        ScheduledFuture<?> prev = waitingTimeouts.remove(roomId);
        if (prev != null) prev.cancel(false);
    }

    private void onWaitingStartTimeout(Long roomId, Long actorIdIgnored) {
        // 타임아웃이 실행되면 맵에서 제거 (start가 먼저 오면 cancelWaitingTimeout이 제거)
        waitingTimeouts.remove(roomId);

        GameState game = gameStateService.getGame(roomId);
        if (game == null) return;

        Long currentActor;
        synchronized (game) {
            if (game.getCurrentPlayerId() == null) return;

            // 정확히 WAITING_FISHING에서만 처리
            if (game.getStatus() != GameStatus.WAITING_FISHING) return;

            // 이미 낚시 세션이 있으면 개입하지 않음
            if (sessions.containsKey(roomId)) return;

            // 실행 시점 currentPlayer 기준으로 실패 처리 (턴 변경 레이스 방지)
            currentActor = game.getCurrentPlayerId();
        }

        FishingEventMessage result = FishingEventMessage.builder()
                .type("ROOM_EVENT_RESULT")
                .eventType("FISHING")
                .roomId(roomId)
                .actorMemberId(currentActor)
                .success(false)
                .message("시간 초과로 실패했어!")
                .build();

        markTurnEndPendingIfExists(roomId, currentActor);
        broadcastToGame(roomId, result);
        scheduleAutoAdvanceTurnIfStillInProgress(roomId, currentActor);
    }

    // 낚시 시작/진행
    public void startFishing(Long roomId, Long actorId) {
        startFishing(roomId, actorId, false);
    }

    // 낚시 시작(떡밥 사용 여부)
    public void startFishing(Long roomId, Long actorId, boolean useBait) {
        Objects.requireNonNull(roomId, "roomId is required");
        Objects.requireNonNull(actorId, "actorId is required");

        cancelWaitingTimeout(roomId);

        if (!canActorStartFishing(roomId, actorId)) {
            sendError(roomId, "현재 턴 유저만 낚시를 시작할 수 있어요.");
            return;
        }

        if (sessions.containsKey(roomId)) {
            sendError(roomId, "이미 진행 중인 낚시 이벤트가 있어요.");
            return;
        }

        boolean baitBoosted = false;
        if (useBait) {
            // 떡밥(낚시 찬스) 1개 소모 시도
            baitBoosted = tryConsumeFishingChanceBait(roomId, actorId);
        }

        HarvestType ht = pickAutoHarvestType(baitBoosted);

        // 세션 생성 레이스 실패 시 환불까지 포함
        startFishingInternal(roomId, actorId, ht, baitBoosted);
    }

    // 낚시 시작(타입 지정)
    public void startFishing(Long roomId, Long actorId, String harvestTypeStr) {
        Objects.requireNonNull(roomId, "roomId is required");
        Objects.requireNonNull(actorId, "actorId is required");
        Objects.requireNonNull(harvestTypeStr, "harvestType is required");

        cancelWaitingTimeout(roomId);

        HarvestType ht;
        try {
            ht = HarvestType.valueOf(harvestTypeStr);
        } catch (IllegalArgumentException e) {
            sendError(roomId, "harvestType 값이 올바르지 않아요: " + harvestTypeStr);
            return;
        }

        if (!isFishingAllowed(ht)) {
            sendError(roomId, "낚시에서는 FISH_SMALL_1/2 / FISH_MEDIUM_1/2 / FISH_LARGE / FISH_RARE 만 사용할 수 있어요: " + harvestTypeStr);
            return;
        }

        if (!canActorStartFishing(roomId, actorId)) {
            sendError(roomId, "현재 턴 유저만 낚시를 시작할 수 있어요.");
            return;
        }

        startFishingInternal(roomId, actorId, ht, false);
    }

    // 내부 공통 시작 로직
    private void startFishingInternal(Long roomId, Long actorId, HarvestType ht, boolean baitConsumed) {
        if (!isFishingAllowed(ht)) {
            sendError(roomId, "낚시에서는 FISH_SMALL_1/2 / FISH_MEDIUM_1/2 / FISH_LARGE / FISH_RARE 만 사용할 수 있어요: " + ht);
            if (baitConsumed) refundFishingChanceBait(roomId, actorId);
            return;
        }

        if (sessions.containsKey(roomId)) {
            sendError(roomId, "이미 진행 중인 낚시 이벤트가 있어요.");
            if (baitConsumed) refundFishingChanceBait(roomId, actorId);
            return;
        }

        long now = System.currentTimeMillis();
        long startAt = now + ThreadLocalRandom.current().nextLong(START_DELAY_MIN_MS, START_DELAY_MAX_MS + 1);

        long durationMs = durationFor(ht);
        long expiresAt = startAt + durationMs;

        long seed = makeSeed(roomId, actorId, startAt);

        FishingSession data = FishingPolicy.createSessionData(ht, seed, startAt);

        FishingEventSession session = new FishingEventSession(roomId, actorId, startAt, expiresAt, seed, data);

        FishingEventSession prev = sessions.putIfAbsent(roomId, session);
        if (prev != null) {
            sendError(roomId, "이미 진행 중인 낚시 이벤트가 있어요.");
            if (baitConsumed) refundFishingChanceBait(roomId, actorId);
            return;
        }

        // 세션 생성 성공 이후에만 상태 변경
        markFishingInProgressIfExists(roomId, actorId);

        FishingEventMessage started = buildStartedMessage(session, durationMs);
        broadcastToGame(roomId, started);

        long timeoutDelay = Math.max(0, expiresAt - System.currentTimeMillis());
        ScheduledFuture<?> timeoutFuture = scheduler.schedule(() -> onTimeout(roomId), timeoutDelay, TimeUnit.MILLISECONDS);
        session.setTimeoutFuture(timeoutFuture);
    }

    public void handleAction(Long roomId, Long actorId, String action) {
        Objects.requireNonNull(roomId, "roomId is required");
        Objects.requireNonNull(actorId, "actorId is required");
        Objects.requireNonNull(action, "action is required");

        FishingEventSession session = sessions.get(roomId);
        if (session == null) {
            sendError(roomId, "진행 중인 낚시 이벤트가 없어요.");
            return;
        }

        if (!session.actorId.equals(actorId)) return;

        if (!isCurrentTurnActorIfGameExists(roomId, actorId)) {
            cancelIfRunning(roomId);
            return;
        }

        if (session.resolved.get()) return;

        long now = System.currentTimeMillis();

        if (now >= session.expiresAtEpochMs) {
            onTimeout(roomId);
            return;
        }

        FishingHandler.ActionOutcome out;
        synchronized (session.mutex) {
            if (session.resolved.get()) return;

            out = fishingHandler.handleAction(
                    session.eventStartTimeMs,
                    session.expiresAtEpochMs,
                    now,
                    roomId,
                    actorId,
                    session.data,
                    action
            );
        }

        FishingEventMessage update = out.updateMessage();
        if (update != null) broadcastToGame(roomId, update);

        FishingEventMessage result = out.resultMessage();
        if (result != null) resolve(roomId, session, result);
    }

    public void cancelIfRunning(Long roomId) {
        cancelWaitingTimeout(roomId);

        FishingEventSession session = sessions.remove(roomId);
        if (session == null) return;

        session.resolved.set(true);

        ScheduledFuture<?> timeoutFuture = session.timeoutFuture;
        if (timeoutFuture != null) timeoutFuture.cancel(false);
    }

    private void onTimeout(Long roomId) {
        FishingEventSession session = sessions.get(roomId);
        if (session == null) return;
        if (session.resolved.get()) return;

        if (!isCurrentTurnActorIfGameExists(roomId, session.actorId)) {
            cancelIfRunning(roomId);
            return;
        }

        long now = System.currentTimeMillis();
        FishingEventMessage result = fishingHandler.handleTimeout(roomId, session.actorId, now, session.data);
        resolve(roomId, session, result);
    }

    private void resolve(Long roomId, FishingEventSession session, FishingEventMessage resultMessage) {
        if (!session.resolved.compareAndSet(false, true)) return;

        ScheduledFuture<?> timeoutFuture = session.timeoutFuture;
        if (timeoutFuture != null) timeoutFuture.cancel(false);

        applyFishingResultToGameStateIfExists(roomId, session.actorId, resultMessage);

        markTurnEndPendingIfExists(roomId, session.actorId);

        broadcastToGame(roomId, resultMessage);

        scheduleAutoAdvanceTurnIfStillInProgress(roomId, session.actorId);

        sessions.remove(roomId);
    }

    private void scheduleAutoAdvanceTurnIfStillInProgress(Long roomId, Long actorId) {
        scheduler.schedule(
                () -> {
                    GameState game = gameStateService.getGame(roomId);
                    if (game == null) return;

                    synchronized (game) {
                        if (!Objects.equals(game.getCurrentPlayerId(), actorId)) return;

                        if (game.getStatus() != GameStatus.FISHING_IN_PROGRESS
                                && game.getStatus() != GameStatus.TURN_END_PENDING
                                && game.getStatus() != GameStatus.WAITING_FISHING) {
                            return;
                        }

                        gameStateService.turnToNextPlayer(roomId);

                        if (game.getCurrentRound() > game.getTotalRounds()) {
                            game.setGameOver(true);
                            game.setStatus(GameStatus.FINISHED);

                            gameStateService.calculateRanking(roomId);

                            GameMessage over = buildGameSnapshotMessage("GAME_OVER", game, game.getCurrentPlayerId());
                            broadcastToGame(roomId, over);
                            return;
                        }

                        GameMessage msg = buildGameSnapshotMessage("TURN_COMPLETED", game, game.getCurrentPlayerId());
                        broadcastToGame(roomId, msg);
                    }
                },
                TURN_END_AUTO_ADVANCE_MS,
                TimeUnit.MILLISECONDS
        );
    }

    private boolean canActorStartFishing(Long roomId, Long actorId) {
        GameState game = gameStateService.getGame(roomId);
        if (game == null) return false;

        synchronized (game) {
            if (game.getCurrentPlayerId() == null) return false;
            if (game.getStatus() != GameStatus.WAITING_FISHING) return false;
            return actorId.equals(game.getCurrentPlayerId());
        }
    }

    private boolean isCurrentTurnActorIfGameExists(Long roomId, Long actorId) {
        GameState game = gameStateService.getGame(roomId);
        if (game == null) return false;

        synchronized (game) {
            if (game.getCurrentPlayerId() == null) return false;

            if (game.getStatus() != GameStatus.WAITING_FISHING
                    && game.getStatus() != GameStatus.FISHING_IN_PROGRESS) {
                return false;
            }

            return actorId.equals(game.getCurrentPlayerId());
        }
    }

    private void markFishingInProgressIfExists(Long roomId, Long actorId) {
        GameState game = gameStateService.getGame(roomId);
        if (game == null) return;

        synchronized (game) {
            if (game.getCurrentPlayerId() == null) return;
            if (!actorId.equals(game.getCurrentPlayerId())) return;

            if (game.getStatus() == GameStatus.WAITING_FISHING) {
                game.setStatus(GameStatus.FISHING_IN_PROGRESS);
            }
        }
    }

    private void markTurnEndPendingIfExists(Long roomId, Long actorId) {
        GameState game = gameStateService.getGame(roomId);
        if (game == null) return;

        synchronized (game) {
            if (game.getCurrentPlayerId() == null) return;
            if (!actorId.equals(game.getCurrentPlayerId())) return;

            if (game.getStatus() == GameStatus.WAITING_FISHING
                    || game.getStatus() == GameStatus.FISHING_IN_PROGRESS) {
                game.setStatus(GameStatus.TURN_END_PENDING);
            }
        }
    }

    private FishingEventMessage buildStartedMessage(FishingEventSession session, long durationMs) {
        return FishingEventMessage.builder()
                .type("ROOM_EVENT_STARTED")
                .eventType("FISHING")
                .roomId(session.roomId)
                .actorMemberId(session.actorId)
                .harvestType(session.data.getHarvestType().name())
                .eventStartTimeMs(session.eventStartTimeMs)
                .durationMs(durationMs)
                .seed(session.seed)
                .params(fishingHandler.buildStartedParams(session.data))
                .build();
    }

    private void broadcastToGame(Long roomId, Object payload) {
        messagingTemplate.convertAndSend("/topic/games/" + roomId, payload);
    }

    private void sendError(Long roomId, String message) {
        FishingEventMessage err = FishingEventMessage.builder()
                .type("ERROR")
                .eventType("FISHING")
                .roomId(roomId)
                .message(message)
                .build();

        broadcastToGame(roomId, err);
    }

    private void applyFishingResultToGameStateIfExists(Long roomId, Long actorId, FishingEventMessage result) {
        GameState game = gameStateService.getGame(roomId);
        if (game == null) return;

        synchronized (game) {
            if (game.getCurrentPlayerId() == null) return;
            if (!actorId.equals(game.getCurrentPlayerId())) return;

            if (game.getStatus() != GameStatus.WAITING_FISHING
                    && game.getStatus() != GameStatus.FISHING_IN_PROGRESS
                    && game.getStatus() != GameStatus.TURN_END_PENDING) {
                return;
            }

            if (result != null
                    && Boolean.TRUE.equals(result.getSuccess())
                    && result.getGainedQty() != null
                    && result.getGainedQty() > 0) {
                try {
                    HarvestType ht = HarvestType.valueOf(result.getHarvestType());
                    GamePlayerState player = game.getPlayers().get(actorId);
                    if (player != null) {
                        int prev = player.getHarvests().getOrDefault(ht, 0);
                        player.getHarvests().put(ht, prev + result.getGainedQty());
                    }
                } catch (IllegalArgumentException ignored) {
                }
            }
        }
    }

    private GameMessage buildGameSnapshotMessage(String type, GameState gameState, Long actorId) {
        GameMessage msg = new GameMessage();
        msg.setType(type);
        msg.setRoomId(gameState.getRoomId());
        msg.setMemberId(actorId);
        msg.setStatus(gameState.getStatus().name());
        msg.setCurrentPlayerId(gameState.getCurrentPlayerId());
        msg.setPlayers(new ArrayList<>(gameState.getPlayers().values()));
        msg.setTurnOrder(gameState.getTurnOrder());
        msg.setCurrentRound(gameState.getCurrentRound());
        msg.setTimeoutSeconds(gameState.getStatus().getTimeoutSeconds());
        return msg;
    }

    private HarvestType pickAutoHarvestType(boolean baitBoosted) {
        int roll = ThreadLocalRandom.current().nextInt(100);

        if (!baitBoosted) {
            if (roll < 40) return pickSmallVariant();
            if (roll < 80) return pickMediumVariant();
            return HarvestType.FISH_LARGE;
        }

        if (roll < 50) return HarvestType.FISH_RARE;
        if (roll < 70) return pickSmallVariant();
        if (roll < 90) return pickMediumVariant();
        return HarvestType.FISH_LARGE;
    }

    private HarvestType pickSmallVariant() {
        return ThreadLocalRandom.current().nextBoolean() ? HarvestType.FISH_SMALL_1 : HarvestType.FISH_SMALL_2;
    }

    private HarvestType pickMediumVariant() {
        return ThreadLocalRandom.current().nextBoolean() ? HarvestType.FISH_MEDIUM_1 : HarvestType.FISH_MEDIUM_2;
    }

    private boolean tryConsumeFishingChanceBait(Long roomId, Long actorId) {
        GameState game = gameStateService.getGame(roomId);
        if (game == null) return false;

        synchronized (game) {
            GamePlayerState player = game.getPlayers().get(actorId);
            if (player == null) return false;

            List<ShopItemType> items = player.getShopItems();
            if (items == null || items.isEmpty()) return false;

            int cnt = countInShopItems(items, ShopItemType.FISHING_CHANCE);
            if (cnt <= 0) return false;

            return removeOneFromShopItems(items, ShopItemType.FISHING_CHANCE);
        }
    }

    private void refundFishingChanceBait(Long roomId, Long actorId) {
        GameState game = gameStateService.getGame(roomId);
        if (game == null) return;

        synchronized (game) {
            GamePlayerState player = game.getPlayers().get(actorId);
            if (player == null) return;

            List<ShopItemType> items = player.getShopItems();
            if (items == null) {
                items = new ArrayList<>();
                player.setShopItems(items);
            }
            items.add(ShopItemType.FISHING_CHANCE);
        }
    }

    private int countInShopItems(List<ShopItemType> items, ShopItemType target) {
        int c = 0;
        for (ShopItemType it : items) {
            if (it == target) c++;
        }
        return c;
    }

    private boolean removeOneFromShopItems(List<ShopItemType> items, ShopItemType target) {
        return items.remove(target);
    }

    private boolean isFishingAllowed(HarvestType ht) {
        if (ht == null) return false;
        return ht == HarvestType.FISH_SMALL_1
                || ht == HarvestType.FISH_SMALL_2
                || ht == HarvestType.FISH_MEDIUM_1
                || ht == HarvestType.FISH_MEDIUM_2
                || ht == HarvestType.FISH_LARGE
                || ht == HarvestType.FISH_RARE;
    }

    private long durationFor(HarvestType ht) {
        if (ht == null) return DURATION_SMALL_MS;

        if (ht == HarvestType.FISH_SMALL_1 || ht == HarvestType.FISH_SMALL_2) return DURATION_SMALL_MS;
        if (ht == HarvestType.FISH_MEDIUM_1 || ht == HarvestType.FISH_MEDIUM_2) return DURATION_MEDIUM_MS;
        if (ht == HarvestType.FISH_LARGE) return DURATION_LARGE_MS;
        if (ht == HarvestType.FISH_RARE) return DURATION_RARE_MS;

        return DURATION_SMALL_MS;
    }

    private long makeSeed(Long roomId, Long actorId, long startAt) {
        long x = roomId * 31L + actorId * 131L + startAt * 17L;
        x ^= (x << 13);
        x ^= (x >>> 7);
        x ^= (x << 17);
        return x;
    }

    private static class FishingEventSession {

        private final Long roomId;
        private final Long actorId;
        private final long eventStartTimeMs;
        private final long expiresAtEpochMs;
        private final long seed;
        private final FishingSession data;

        private final Object mutex = new Object();
        private final AtomicBoolean resolved = new AtomicBoolean(false);

        private volatile ScheduledFuture<?> timeoutFuture;

        private FishingEventSession(
                Long roomId,
                Long actorId,
                long eventStartTimeMs,
                long expiresAtEpochMs,
                long seed,
                FishingSession data
        ) {
            this.roomId = roomId;
            this.actorId = actorId;
            this.eventStartTimeMs = eventStartTimeMs;
            this.expiresAtEpochMs = expiresAtEpochMs;
            this.seed = seed;
            this.data = data;
        }

        public void setTimeoutFuture(ScheduledFuture<?> future) {
            this.timeoutFuture = future;
        }
    }
}
