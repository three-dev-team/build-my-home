package com.buildmyhome.fishing.service;

import com.buildmyhome.fishing.dto.RoomEventErrorMessage;
import com.buildmyhome.fishing.dto.RoomEventResultMessage;
import com.buildmyhome.fishing.dto.RoomEventStartedMessage;
import com.buildmyhome.fishing.dto.RoomEventUpdateMessage;
import com.buildmyhome.fishing.handler.FishingHandler;
import com.buildmyhome.fishing.model.FishingSession;
import com.buildmyhome.fishing.policy.FishingPolicy;
import com.buildmyhome.game.dto.GameMessage;
import com.buildmyhome.game.dto.GamePlayerState;
import com.buildmyhome.game.dto.GameState;
import com.buildmyhome.game.dto.GameStatus;
import com.buildmyhome.game.dto.HarvestType;
import com.buildmyhome.game.service.GameStateService;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
@RequiredArgsConstructor
public class FishingService {

    // 방(roomId)당 진행 중인 낚시 이벤트는 1개만 유지
    // 낚시 이벤트 메시지는 게임 채널(/topic/games/{roomId})로 브로드캐스트
    // LARGE는 서버가 진행도/장력 업데이트(ROOM_EVENT_UPDATE)를 주기적으로 쏴줘야 해서 tick 스케줄을 추가
    private static final long START_DELAY_MIN_MS = 200L;
    private static final long START_DELAY_MAX_MS = 400L;

    private static final long DURATION_SMALL_MS = 6000L;
    private static final long DURATION_MEDIUM_MS = 8000L;
    private static final long DURATION_LARGE_MS = 10000L;

    // LARGE 서버 tick 주기 (프론트는 이 update를 받아서 부드럽게 표현 가능)
    private static final long LARGE_TICK_PERIOD_MS = 100L;

    private static final String ACTION_TICK = "TICK";

    private final SimpMessagingTemplate messagingTemplate;
    private final GameStateService gameStateService;
    private final FishingHandler fishingHandler;

    private final ConcurrentHashMap<Long, FishingEventSession> sessions = new ConcurrentHashMap<>();

    // tick + timeout 스케줄러
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);

    @PreDestroy
    public void shutdown() {
        scheduler.shutdownNow();
    }

    // 게임 흐름에서 자동으로 호출되는 시작 (GameWsController 등)
    // - SMALL/MEDIUM/LARGE 중 "동일 확률(1/3)"로 랜덤 선택
    public void startFishing(Long roomId, Long actorId) {
        HarvestType ht = pickAutoHarvestType();
        startFishing(roomId, actorId, ht.name());
    }

    // (디버그/확장용) 외부에서 낚시 타입을 지정해 시작
    public void startFishing(Long roomId, Long actorId, String harvestTypeStr) {
        Objects.requireNonNull(roomId, "roomId is required");
        Objects.requireNonNull(actorId, "actorId is required");
        Objects.requireNonNull(harvestTypeStr, "harvestType is required");

        HarvestType ht;
        try {
            ht = HarvestType.valueOf(harvestTypeStr);
        } catch (IllegalArgumentException e) {
            sendError(roomId, "harvestType 값이 올바르지 않아요: " + harvestTypeStr);
            return;
        }

        if (!(ht == HarvestType.FISH_SMALL || ht == HarvestType.FISH_MEDIUM || ht == HarvestType.FISH_LARGE)) {
            sendError(roomId, "낚시에서는 FISH_SMALL / FISH_MEDIUM / FISH_LARGE 만 사용할 수 있어요: " + harvestTypeStr);
            return;
        }

        // 게임이 존재하면: (1) 현재 턴 유저인지 (2) 상태가 WAITING_FISHING 인지
        if (!canActorStartFishing(roomId, actorId)) {
            sendError(roomId, "현재 턴 유저만 낚시를 시작할 수 있어요.");
            return;
        }

        long now = System.currentTimeMillis();
        long startAt = now + ThreadLocalRandom.current().nextLong(START_DELAY_MIN_MS, START_DELAY_MAX_MS + 1);

        long durationMs = switch (ht) {
            case FISH_SMALL -> DURATION_SMALL_MS;
            case FISH_MEDIUM -> DURATION_MEDIUM_MS;
            case FISH_LARGE -> DURATION_LARGE_MS;
            default -> DURATION_SMALL_MS;
        };

        long expiresAt = startAt + durationMs;
        long seed = makeSeed(roomId, actorId, startAt);

        // FishingPolicy는 타입별 룰(타이밍/2스테이지/릴링 파라미터)을 seed 기반으로 생성
        FishingSession data = FishingPolicy.createSessionData(ht, durationMs, seed, startAt);

        FishingEventSession session = new FishingEventSession(
                roomId, actorId, startAt, expiresAt, seed, data
        );

        FishingEventSession prev = sessions.putIfAbsent(roomId, session);
        if (prev != null) {
            sendError(roomId, "이미 진행 중인 낚시 이벤트가 있어요.");
            return;
        }

        RoomEventStartedMessage started = buildStartedMessage(session, durationMs);
        broadcastToGame(roomId, started);

        // 타임아웃 예약
        long timeoutDelay = Math.max(0, expiresAt - System.currentTimeMillis());
        ScheduledFuture<?> timeoutFuture = scheduler.schedule(() -> onTimeout(roomId), timeoutDelay, TimeUnit.MILLISECONDS);
        session.setTimeoutFuture(timeoutFuture);

        // LARGE는 진행도/장력 업데이트를 계속 보내야 하므로 tick 예약
        if (ht == HarvestType.FISH_LARGE) {
            long tickStartDelay = Math.max(0, startAt - System.currentTimeMillis());
            ScheduledFuture<?> tickFuture = scheduler.scheduleAtFixedRate(
                    () -> onTick(roomId),
                    tickStartDelay,
                    LARGE_TICK_PERIOD_MS,
                    TimeUnit.MILLISECONDS
            );
            session.setTickFuture(tickFuture);
        }
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

        // 이벤트를 시작한 actor만 조작 가능 + (게임이 있으면) 현재 턴 유저/상태 강제
        if (!session.actorId.equals(actorId)) return;
        if (!isCurrentTurnActorIfGameExists(roomId, actorId)) {
            // 게임 흐름이 이미 넘어갔으면(타임아웃/턴 종료 등) 세션을 조용히 정리
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

        RoomEventUpdateMessage update = out.updateMessage();
        if (update != null) broadcastToGame(roomId, update);

        RoomEventResultMessage result = out.resultMessage();
        if (result != null) resolve(roomId, session, result);
    }

    // 게임이 턴을 강제로 넘기거나(타임아웃 등) UI가 정리될 때, 혹시 남아있는 세션을 제거.
    public void cancelIfRunning(Long roomId) {
        FishingEventSession session = sessions.remove(roomId);
        if (session == null) return;

        session.resolved.set(true);

        ScheduledFuture<?> timeoutFuture = session.timeoutFuture;
        if (timeoutFuture != null) timeoutFuture.cancel(false);

        ScheduledFuture<?> tickFuture = session.tickFuture;
        if (tickFuture != null) tickFuture.cancel(false);
    }

    private void onTick(Long roomId) {
        FishingEventSession session = sessions.get(roomId);
        if (session == null) return;

        // 게임이 이미 다른 상태로 넘어갔으면 세션 정리
        if (!isCurrentTurnActorIfGameExists(roomId, session.actorId)) {
            cancelIfRunning(roomId);
            return;
        }

        if (session.resolved.get()) {
            ScheduledFuture<?> tickFuture = session.tickFuture;
            if (tickFuture != null) tickFuture.cancel(false);
            return;
        }

        // LARGE만 tick 의미 있음
        if (session.data.getHarvestType() != HarvestType.FISH_LARGE) {
            ScheduledFuture<?> tickFuture = session.tickFuture;
            if (tickFuture != null) tickFuture.cancel(false);
            return;
        }

        long now = System.currentTimeMillis();

        if (now >= session.expiresAtEpochMs) {
            onTimeout(roomId);
            return;
        }

        FishingHandler.ActionOutcome out;
        synchronized (session.mutex) {
            if (session.resolved.get()) return;

            // 서버 tick도 handler에 통일 (진행도/장력 계산 + update/result 생성)
            out = fishingHandler.handleAction(
                    session.eventStartTimeMs,
                    session.expiresAtEpochMs,
                    now,
                    roomId,
                    session.actorId,
                    session.data,
                    ACTION_TICK
            );
        }

        RoomEventUpdateMessage update = out.updateMessage();
        if (update != null) broadcastToGame(roomId, update);

        RoomEventResultMessage result = out.resultMessage();
        if (result != null) resolve(roomId, session, result);
    }

    private void onTimeout(Long roomId) {
        FishingEventSession session = sessions.get(roomId);
        if (session == null) return;
        if (session.resolved.get()) return;

        // 게임이 이미 다른 상태로 넘어갔으면 세션 정리
        if (!isCurrentTurnActorIfGameExists(roomId, session.actorId)) {
            cancelIfRunning(roomId);
            return;
        }

        long now = System.currentTimeMillis();
        RoomEventResultMessage result = fishingHandler.handleTimeout(roomId, session.actorId, now, session.data);
        resolve(roomId, session, result);
    }

    private void resolve(Long roomId, FishingEventSession session, RoomEventResultMessage resultMessage) {
        if (!session.resolved.compareAndSet(false, true)) return;

        ScheduledFuture<?> timeoutFuture = session.timeoutFuture;
        if (timeoutFuture != null) timeoutFuture.cancel(false);

        ScheduledFuture<?> tickFuture = session.tickFuture;
        if (tickFuture != null) tickFuture.cancel(false);

        // 결과를 게임 상태(GameState)에 반영 + 타임아웃(=WAITING_FISHING) 예약이 다시 턴을 넘기지 않도록 상태 전환
        // - Shop은 endShopSession에서 WAITING_PLAYER_ACTION으로 전환하듯,
        //   Fishing은 결과 확정 시 TURN_END_PENDING으로 전환해 "이벤트 종료"를 명확히 한다.
        GameMessage sync = applyFishingResultToGameStateIfExists(roomId, session.actorId, resultMessage);

        // 1) 낚시 결과 (낚시 UI용)
        broadcastToGame(roomId, resultMessage);

        // 2) 갱신된 GameState 스냅샷 (게임 HUD/인벤토리 동기화용)
        if (sync != null) {
            broadcastToGame(roomId, sync);
        }
        sessions.remove(roomId);
    }

    private boolean canActorStartFishing(Long roomId, Long actorId) {
        GameState game = gameStateService.getGame(roomId);
        if (game == null) return true; // 낚시 단독 테스트 허용

        synchronized (game) {
            if (game.getCurrentPlayerId() == null) return false;
            if (game.getStatus() != GameStatus.WAITING_FISHING) return false;
            return actorId.equals(game.getCurrentPlayerId());
        }
    }

    private boolean isCurrentTurnActorIfGameExists(Long roomId, Long actorId) {
        GameState game = gameStateService.getGame(roomId);
        if (game == null) return true;

        synchronized (game) {
            if (game.getCurrentPlayerId() == null) return false;
            if (game.getStatus() != GameStatus.WAITING_FISHING) return false;
            return actorId.equals(game.getCurrentPlayerId());
        }
    }

    private RoomEventStartedMessage buildStartedMessage(FishingEventSession session, long durationMs) {
        Map<String, Object> params = fishingHandler.buildStartedParams(session.data);

        return RoomEventStartedMessage.builder()
                .type("ROOM_EVENT_STARTED")
                .eventType("FISHING")
                .roomId(session.roomId)
                .actorMemberId(session.actorId)
                .harvestType(session.data.getHarvestType().name())
                .eventStartTimeMs(session.eventStartTimeMs)
                .durationMs(durationMs)
                .seed(session.seed)
                .params(params)
                .build();
    }

    private void broadcastToGame(Long roomId, Object payload) {
        messagingTemplate.convertAndSend("/topic/games/" + roomId, payload);
    }

    private void sendError(Long roomId, String message) {
        RoomEventErrorMessage err = RoomEventErrorMessage.builder()
                .type("ERROR")
                .roomId(roomId)
                .message(message)
                .build();
        broadcastToGame(roomId, err);
    }

    /**
     * 낚시 결과를 GameState에 반영한다.
     * - 성공이면: 현재 턴 플레이어의 harvests[HarvestType]에 gainedQty만큼 누적
     * - 결과 확정 시: GameStatus를 TURN_END_PENDING으로 전환해서
     *   GameWsController의 "WAITING_FISHING 타임아웃 예약"이 중복으로 턴을 넘기지 않도록 한다.
     *
     * @return 프론트 동기화를 위한 GameMessage 스냅샷(없으면 null)
     */
    private GameMessage applyFishingResultToGameStateIfExists(Long roomId, Long actorId, RoomEventResultMessage result) {
        GameState game = gameStateService.getGame(roomId);
        if (game == null) return null; // 낚시 단독 테스트 허용

        synchronized (game) {
            if (game.getCurrentPlayerId() == null) return null;
            if (!actorId.equals(game.getCurrentPlayerId())) return null;

            // WAITING_FISHING이 아니면(이미 다른 흐름으로 넘어감) 결과를 반영하지 않는다.
            if (game.getStatus() != GameStatus.WAITING_FISHING) return null;

            // 성공이면 수확물 누적
            if (result != null && result.isSuccess() && result.getGainedQty() > 0) {
                try {
                    HarvestType ht = HarvestType.valueOf(result.getHarvestType());
                    GamePlayerState player = game.getPlayers().get(actorId);
                    if (player != null) {
                        int prev = player.getHarvests().getOrDefault(ht, 0);
                        player.getHarvests().put(ht, prev + result.getGainedQty());
                    }
                } catch (IllegalArgumentException ignored) {
                    // harvestType 파싱 실패는 낚시 결과 UI에는 영향 없으니 조용히 무시
                }
            }

            // 이벤트 종료 상태로 전환 (타임아웃 중복 nextTurn 방지)
            game.setStatus(GameStatus.TURN_END_PENDING);

            return buildGameSnapshotMessage("CURRENT_GAME_STATE", game, actorId);
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

    private HarvestType pickAutoHarvestType() {
        // 동일 확률(1/3) 랜덤
        int r = ThreadLocalRandom.current().nextInt(3);
        return switch (r) {
            case 0 -> HarvestType.FISH_SMALL;
            case 1 -> HarvestType.FISH_MEDIUM;
            default -> HarvestType.FISH_LARGE;
        };
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

        // tick 스레드 / WS 액션 스레드가 같은 data를 만지므로 mutex로 보호
        private final Object mutex = new Object();

        private final AtomicBoolean resolved = new AtomicBoolean(false);
        private volatile ScheduledFuture<?> timeoutFuture;
        private volatile ScheduledFuture<?> tickFuture;

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

        public void setTickFuture(ScheduledFuture<?> future) {
            this.tickFuture = future;
        }
    }
}