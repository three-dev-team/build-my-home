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

    private static final long START_DELAY_MIN_MS = 200L;  // 시작 지연 최소값(ms)
    private static final long START_DELAY_MAX_MS = 400L; // 시작 지연 최대값(ms)

    private static final long DURATION_SMALL_MS = 6000L; // SMALL 제한 시간(ms)
    private static final long DURATION_MEDIUM_MS = 8000L; // MEDIUM 제한 시간(ms)
    private static final long DURATION_LARGE_MS = 10000L; // LARGE 제한 시간(ms)

    private static final long TURN_END_AUTO_ADVANCE_MS = 5000L; // event-complete 미수신 대비 자동 턴 진행 지연(ms)

    // ✅DEV ONLY: 개발 테스트용 턴 우회 플래그 키
    private static final String DEV_FORCE_MY_TURN_FLAG = "DEV_FORCE_MY_TURN";

    private final SimpMessagingTemplate messagingTemplate;
    private final GameStateService gameStateService;
    private final FishingHandler fishingHandler;

    // roomId 기준 진행 세션 저장소
    private final ConcurrentHashMap<Long, FishingEventSession> sessions = new ConcurrentHashMap<>();

    // timeout 및 자동 진행 예약 스케줄러
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);

    // 서버 종료 시 스케줄러 정리 메소드
    @PreDestroy
    public void shutdown() {
        scheduler.shutdownNow();
    }

    // ✅DEV ONLY: 개발 테스트용 턴 우회 플래그 확인 메소드
    // System property 우선, 없으면 env 사용
    private boolean isDevForceMyTurnEnabled() {
        String v = System.getProperty(DEV_FORCE_MY_TURN_FLAG);
        if (v == null || v.isBlank()) v = System.getenv(DEV_FORCE_MY_TURN_FLAG);
        if (v == null) return false;
        return "1".equals(v) || "true".equalsIgnoreCase(v);
    }

    // 낚시 시작 메소드
    // 소중대 동일 확률 자동 선택
    public void startFishing(Long roomId, Long actorId) {
        HarvestType ht = pickAutoHarvestType();
        startFishing(roomId, actorId, ht.name());
    }

    // 낚시 시작 메소드
    // 타입 지정 시작
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

        // 낚시 허용 타입 검사
        if (!(ht == HarvestType.FISH_SMALL || ht == HarvestType.FISH_MEDIUM || ht == HarvestType.FISH_LARGE)) {
            sendError(roomId, "낚시에서는 FISH_SMALL / FISH_MEDIUM / FISH_LARGE 만 사용할 수 있어요: " + harvestTypeStr);
            return;
        }

        // 시작 가능 여부 검사
        if (!canActorStartFishing(roomId, actorId)) {
            sendError(roomId, "현재 턴 유저만 낚시를 시작할 수 있어요.");
            return;
        }

        long now = System.currentTimeMillis();
        long startAt = now + ThreadLocalRandom.current().nextLong(START_DELAY_MIN_MS, START_DELAY_MAX_MS + 1);

        // 타입별 제한 시간 계산
        long durationMs = switch (ht) {
            case FISH_SMALL -> DURATION_SMALL_MS;
            case FISH_MEDIUM -> DURATION_MEDIUM_MS;
            case FISH_LARGE -> DURATION_LARGE_MS;
            default -> DURATION_SMALL_MS;
        };

        long expiresAt = startAt + durationMs;

        // seed 생성 메소드
        long seed = makeSeed(roomId, actorId, startAt);

        // seed 기반 세션 데이터 생성 메소드
        // NOTE: FishingPolicy는 seed + startAt을 기준으로 "재현 가능한" 룰(게이지/윈도우/펌프)을 만든다.
        FishingSession data = FishingPolicy.createSessionData(ht, seed, startAt);

        FishingEventSession session = new FishingEventSession(
                roomId, actorId, startAt, expiresAt, seed, data
        );

        // roomId 기준 중복 시작 방지
        FishingEventSession prev = sessions.putIfAbsent(roomId, session);
        if (prev != null) {
            sendError(roomId, "이미 진행 중인 낚시 이벤트가 있어요.");
            return;
        }

        // 게임 상태 전환 메소드
        markFishingInProgressIfExists(roomId, actorId);

        // STARTED 메시지 전송 메소드
        FishingEventMessage started = buildStartedMessage(session, durationMs);
        broadcastToGame(roomId, started);

        // timeout 예약 메소드
        long timeoutDelay = Math.max(0, expiresAt - System.currentTimeMillis());
        ScheduledFuture<?> timeoutFuture = scheduler.schedule(
                () -> onTimeout(roomId),
                timeoutDelay,
                TimeUnit.MILLISECONDS
        );
        session.setTimeoutFuture(timeoutFuture);
    }

    // 액션 처리 진입 메소드
    // HIT/REEL_START/REEL_STOP 처리
    public void handleAction(Long roomId, Long actorId, String action) {
        Objects.requireNonNull(roomId, "roomId is required");
        Objects.requireNonNull(actorId, "actorId is required");
        Objects.requireNonNull(action, "action is required");

        FishingEventSession session = sessions.get(roomId);
        if (session == null) {
            sendError(roomId, "진행 중인 낚시 이벤트가 없어요.");
            return;
        }

        // 시작한 actor만 조작 허용
        if (!session.actorId.equals(actorId)) return;

        // 턴 및 상태 유효성 검사 메소드
        if (!isCurrentTurnActorIfGameExists(roomId, actorId)) {
            cancelIfRunning(roomId);
            return;
        }

        if (session.resolved.get()) return;

        long now = System.currentTimeMillis();

        // 만료 시 timeout 경로 사용
        if (now >= session.expiresAtEpochMs) {
            onTimeout(roomId);
            return;
        }

        FishingHandler.ActionOutcome out;
        synchronized (session.mutex) {
            if (session.resolved.get()) return;

            // 도메인 판정 메소드 호출
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

    // 진행 중 세션 정리 메소드
    public void cancelIfRunning(Long roomId) {
        FishingEventSession session = sessions.remove(roomId);
        if (session == null) return;

        session.resolved.set(true);

        ScheduledFuture<?> timeoutFuture = session.timeoutFuture;
        if (timeoutFuture != null) timeoutFuture.cancel(false);
    }

    // timeout 처리 메소드
    private void onTimeout(Long roomId) {
        FishingEventSession session = sessions.get(roomId);
        if (session == null) return;
        if (session.resolved.get()) return;

        // 턴이 이미 넘어간 상태면 세션만 정리
        if (!isCurrentTurnActorIfGameExists(roomId, session.actorId)) {
            cancelIfRunning(roomId);
            return;
        }

        long now = System.currentTimeMillis();
        FishingEventMessage result = fishingHandler.handleTimeout(roomId, session.actorId, now, session.data);
        resolve(roomId, session, result);
    }

    // 결과 확정 처리 메소드
    // GameState 반영, RESULT 전송, 안전장치 예약, 세션 제거
    private void resolve(Long roomId, FishingEventSession session, FishingEventMessage resultMessage) {
        if (!session.resolved.compareAndSet(false, true)) return;

        ScheduledFuture<?> timeoutFuture = session.timeoutFuture;
        if (timeoutFuture != null) timeoutFuture.cancel(false);

        // 수확 결과 반영 메소드
        applyFishingResultToGameStateIfExists(roomId, session.actorId, resultMessage);

        // 결과 확정 후 상태 전환 메소드
        markTurnEndPendingIfExists(roomId, session.actorId);

        // RESULT 메시지 전송 메소드
        broadcastToGame(roomId, resultMessage);

        // event-complete 미수신 대비 자동 턴 진행 예약 메소드
        scheduleAutoAdvanceTurnIfStillInProgress(roomId, session.actorId);

        sessions.remove(roomId);
    }

    // 자동 턴 진행 예약 메소드
    private void scheduleAutoAdvanceTurnIfStillInProgress(Long roomId, Long actorId) {
        scheduler.schedule(() -> {
            GameState game = gameStateService.getGame(roomId);
            if (game == null) return;

            synchronized (game) {
                if (!Objects.equals(game.getCurrentPlayerId(), actorId)) return;

                // 낚시 관련 상태가 아니면 자동 진행 중단
                if (game.getStatus() != GameStatus.FISHING_IN_PROGRESS
                        && game.getStatus() != GameStatus.TURN_END_PENDING) {
                    return;
                }

                game.nextTurn();

                GameMessage msg = buildGameSnapshotMessage("TURN_COMPLETED", game, game.getCurrentPlayerId());
                broadcastToGame(roomId, msg);
            }
        }, TURN_END_AUTO_ADVANCE_MS, TimeUnit.MILLISECONDS);
    }

    // 시작 가능 여부 검사 메소드
    // - 운영: GameState가 없는 상황에서 낚시만 단독으로 도는 건 유령 세션 위험이 커서 기본적으로 막는다.
    // - 개발: DEV_FORCE_MY_TURN 활성화 시에만 단독 테스트 허용
    private boolean canActorStartFishing(Long roomId, Long actorId) {
        GameState game = gameStateService.getGame(roomId);
        if (game == null) return isDevForceMyTurnEnabled();

        synchronized (game) {
            if (game.getCurrentPlayerId() == null) return false;
            if (game.getStatus() != GameStatus.WAITING_FISHING) return false;
            // ✅ DEV ONLY: 턴 유저 체크 우회
            if (isDevForceMyTurnEnabled()) return true;

            return actorId.equals(game.getCurrentPlayerId());
        }
    }

    // 조작 가능 여부 검사 메소드
    // - 운영: GameState가 없으면 조작도 허용하지 않는다(유령 세션 방지)
    // - 개발: DEV_FORCE_MY_TURN 활성화 시에만 단독 테스트 허용
    private boolean isCurrentTurnActorIfGameExists(Long roomId, Long actorId) {
        GameState game = gameStateService.getGame(roomId);
        if (game == null) return isDevForceMyTurnEnabled();

        synchronized (game) {
            if (game.getCurrentPlayerId() == null) return false;

            // 낚시 관련 상태만 허용
            if (game.getStatus() != GameStatus.WAITING_FISHING
                    && game.getStatus() != GameStatus.FISHING_IN_PROGRESS) {
                return false;
            }
            // ✅ DEV ONLY: 턴 유저 체크 우회
            if (isDevForceMyTurnEnabled()) return true;

            return actorId.equals(game.getCurrentPlayerId());
        }
    }

    // 상태 전환 메소드
    // WAITING_FISHING -> FISHING_IN_PROGRESS
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

    // 상태 전환 메소드
    // 결과 확정 후 TURN_END_PENDING 전환
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

    // STARTED 메시지 생성 메소드
    private FishingEventMessage buildStartedMessage(FishingEventSession session, long durationMs) {
        Map<String, Object> params = fishingHandler.buildStartedParams(session.data);

        return FishingEventMessage.builder()
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

    // /topic/games/{roomId} 브로드캐스트 메소드
    private void broadcastToGame(Long roomId, Object payload) {
        messagingTemplate.convertAndSend("/topic/games/" + roomId, payload);
    }

    // ERROR 메시지 전송 메소드
    private void sendError(Long roomId, String message) {
        FishingEventMessage err = FishingEventMessage.builder()
                .type("ERROR")
                .eventType("FISHING")
                .roomId(roomId)
                .message(message)
                .build();

        broadcastToGame(roomId, err);
    }

    // 결과를 GameState에 반영하는 메소드
    // 성공 결과만 수확물 누적 처리
    private void applyFishingResultToGameStateIfExists(Long roomId, Long actorId, FishingEventMessage result) {
        GameState game = gameStateService.getGame(roomId);
        if (game == null) return;

        synchronized (game) {
            if (game.getCurrentPlayerId() == null) return;
            if (!actorId.equals(game.getCurrentPlayerId())) return;

            // 낚시 관련 상태가 아니면 반영 중단
            if (game.getStatus() != GameStatus.WAITING_FISHING
                    && game.getStatus() != GameStatus.FISHING_IN_PROGRESS) {
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
                    // harvestType 파싱 실패 무시
                }
            }
        }
    }

    // GameMessage 스냅샷 생성 메소드
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

    // 소중대 동일 확률 랜덤 선택 메소드
    private HarvestType pickAutoHarvestType() {
        int r = ThreadLocalRandom.current().nextInt(3);
        return switch (r) {
            case 0 -> HarvestType.FISH_SMALL;
            case 1 -> HarvestType.FISH_MEDIUM;
            default -> HarvestType.FISH_LARGE;
        };
    }

    // seed 생성 메소드
    private long makeSeed(Long roomId, Long actorId, long startAt) {
        long x = roomId * 31L + actorId * 131L + startAt * 17L;
        x ^= (x << 13);
        x ^= (x >>> 7);
        x ^= (x << 17);
        return x;
    }

    // roomId 기준 세션 보관용 내부 클래스
    private static class FishingEventSession {
        private final Long roomId;
        private final Long actorId;
        private final long eventStartTimeMs;
        private final long expiresAtEpochMs;
        private final long seed;
        private final FishingSession data;

        // 세션 데이터 동시 접근 보호용 락
        private final Object mutex = new Object();

        // resolve 중복 방지 플래그
        private final AtomicBoolean resolved = new AtomicBoolean(false);

        // timeout 예약 취소용 핸들
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

        // timeoutFuture 설정 메소드
        public void setTimeoutFuture(ScheduledFuture<?> future) {
            this.timeoutFuture = future;
        }
    }
}
