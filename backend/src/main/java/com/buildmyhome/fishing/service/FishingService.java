package com.buildmyhome.fishing.service;

import com.buildmyhome.fishing.dto.RoomEventErrorMessage;
import com.buildmyhome.fishing.dto.RoomEventResultMessage;
import com.buildmyhome.fishing.dto.RoomEventStartedMessage;
import com.buildmyhome.fishing.dto.RoomEventUpdateMessage;
import com.buildmyhome.fishing.handler.FishingHandler;
import com.buildmyhome.fishing.model.FishingSession;
import com.buildmyhome.fishing.policy.FishingPolicy;
import com.buildmyhome.game.dto.GameState;
import com.buildmyhome.game.dto.GameStatus;
import com.buildmyhome.game.dto.HarvestType;
import com.buildmyhome.game.service.GameStateService;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Objects;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
@RequiredArgsConstructor
public class FishingService {

    private final SimpMessagingTemplate messagingTemplate;
    private final GameStateService gameStateService;
    private final FishingHandler fishingHandler;

    // TODO(공통화-이벤트엔진 v1):
    // [현재 역할]
    // - roomId당 "진행 중 이벤트 1개"를 Map(sessions)으로 관리한다.
    // - start 시 putIfAbsent로 중복 이벤트 시작을 막는다.
    // - 스케줄러로 timeoutFuture를 걸어 제한시간 내 액션이 없으면 자동 실패 처리한다.
    // - resolveOnce(AtomicBoolean)로 결과(성공/실패)를 "단 1회"만 확정한다.
    // - resolve 이후 timeout 취소 + sessions.remove로 메모리/상태를 정리한다.
    //
    // [왜 공통으로 빼야 하나]
    // - 상점/대출/미니게임/선택지 등 "시간 제한 + 1회 확정 + 정리" 패턴이 동일하게 반복된다.
    // - 각 도메인마다 이 로직을 복붙하면:
    //   (1) 중복 resolve / timeout 누락 / sessions 정리 누락 버그가 이벤트마다 재발생한다.
    //   (2) 에러 메시지 형식(type/eventType)도 이벤트마다 달라져 프론트 분기가 폭증한다.
    // - 따라서 이벤트 생명주기(등록/timeout/resolve/정리)는 공통 엔진이 책임지고,
    //   도메인(낚시/상점/대출)은 "규칙/판정/보상"만 제공하는 구조가 유지보수에 유리하다.

    private final ConcurrentHashMap<Long, FishingEventSession> sessions = new ConcurrentHashMap<>();
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(2);

    @PreDestroy
    public void shutdown() {
        scheduler.shutdownNow();
    }

    public void startFishing(Long roomId, Long actorId, String harvestTypeStr) {
        Objects.requireNonNull(roomId, "roomId is required");
        Objects.requireNonNull(actorId, "actorId is required");
        Objects.requireNonNull(harvestTypeStr, "harvestType is required");

        //  enum 검증 +  fish-only 제한
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

        // 게임 상태가 있으면 '턴 유저/상태' 강제
        if (!canActorStartFishing(roomId, actorId)) {
            sendError(roomId, "현재 턴 유저만 낚시를 시작할 수 있어요.");
            return;
        }

        long now = System.currentTimeMillis();
        long startAt = now + ThreadLocalRandom.current().nextLong(200, 401);

        long durationMs = switch (ht) {
            case FISH_SMALL -> 6000;
            case FISH_MEDIUM -> 8000;
            case FISH_LARGE -> 10000;
            default -> 6000; // 여기 도달 X
        };

        long expiresAt = startAt + durationMs;
        long seed = makeSeed(roomId, actorId, startAt);

        FishingSession data = FishingPolicy.createSessionData(harvestTypeStr, durationMs, seed, startAt);

        FishingEventSession session = new FishingEventSession(
                roomId, actorId, startAt, expiresAt, seed, data
        );

        FishingEventSession prev = sessions.putIfAbsent(roomId, session);
        if (prev != null) {
            sendError(roomId, "이미 진행 중인 낚시 이벤트가 있어요.");
            return;
        }

        setGameStatusIfExists(roomId, GameStatus.WAITING_FISHING);

        RoomEventStartedMessage started = buildStartedMessage(session, durationMs);
        broadcast(roomId, started);

        long delay = Math.max(0, expiresAt - System.currentTimeMillis());
        ScheduledFuture<?> future = scheduler.schedule(() -> onTimeout(roomId), delay, TimeUnit.MILLISECONDS);
        session.setTimeoutFuture(future);
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

        // actorId 일치 + (게임 상태가 있으면) 현재 턴 유저 강제
        if (!session.actorId.equals(actorId)) return;
        if (!isCurrentTurnActorIfGameExists(roomId, actorId)) return;

        long now = System.currentTimeMillis();
        if (session.resolved.get()) return;

        if (now >= session.expiresAtEpochMs) {
            onTimeout(roomId);
            return;
        }

        FishingHandler.ActionOutcome out = fishingHandler.handleAction(
                session.eventStartTimeMs,
                session.expiresAtEpochMs,
                now,
                roomId,
                actorId,
                session.data,
                action
        );

        RoomEventUpdateMessage update = out.updateMessage();
        if (update != null) broadcast(roomId, update);

        RoomEventResultMessage result = out.resultMessage();
        if (result != null) resolve(roomId, session, result);
    }

    private void onTimeout(Long roomId) {
        FishingEventSession session = sessions.get(roomId);
        if (session == null) return;

        if (session.resolved.get()) return;

        long now = System.currentTimeMillis();
        RoomEventResultMessage result = fishingHandler.handleTimeout(roomId, session.actorId, now, session.data);
        resolve(roomId, session, result);
    }

    private void resolve(Long roomId, FishingEventSession session, RoomEventResultMessage resultMessage) {
        if (!session.resolved.compareAndSet(false, true)) return;

        ScheduledFuture<?> future = session.timeoutFuture;
        if (future != null) future.cancel(false);

        setGameStatusIfExists(roomId, GameStatus.TURN_END_PENDING);

        broadcast(roomId, resultMessage);
        sessions.remove(roomId);
    }

    private boolean canActorStartFishing(Long roomId, Long actorId) {
        GameState game = gameStateService.getGame(roomId);
        if (game == null) return true; // 낚시 단독 테스트 허용

        synchronized (game) {
            if (game.getCurrentPlayerId() == null) return false;
            // 필요하면 여기서 status도 강제 (예: WAITING_FISHING로만 허용)
            return actorId.equals(game.getCurrentPlayerId());
        }
    }

    private boolean isCurrentTurnActorIfGameExists(Long roomId, Long actorId) {
        GameState game = gameStateService.getGame(roomId);
        if (game == null) return true;

        synchronized (game) {
            return game.getCurrentPlayerId() != null && actorId.equals(game.getCurrentPlayerId());
        }
    }

    private RoomEventStartedMessage buildStartedMessage(FishingEventSession session, long durationMs) {
        Map<String, Object> params = fishingHandler.buildStartedParams(session.data);

        return RoomEventStartedMessage.builder()
                .type("ROOM_EVENT_STARTED")
                .eventType("FISHING")
                .roomId(session.roomId)
                .actorMemberId(session.actorId)
                .harvestType(session.data.getHarvestType())
                .eventStartTimeMs(session.eventStartTimeMs)
                .durationMs(durationMs)
                .seed(session.seed)
                .params(params)
                .build();
    }

    private void broadcast(Long roomId, Object payload) {
        messagingTemplate.convertAndSend("/topic/rooms/" + roomId, payload);
        messagingTemplate.convertAndSend("/topic/games/" + roomId, payload);
    }

    private void sendError(Long roomId, String message) {
        RoomEventErrorMessage err = RoomEventErrorMessage.builder()
                .type("ERROR")
                .roomId(roomId)
                .message(message)
                .build();
        broadcast(roomId, err);
    }

    private void setGameStatusIfExists(Long roomId, GameStatus status) {
        GameState game = gameStateService.getGame(roomId);
        if (game == null) return;
        synchronized (game) {
            game.setStatus(status);
        }
    }

    private long makeSeed(Long roomId, Long actorId, long startAt) {
        long x = roomId * 31L + actorId * 131L + startAt * 17L;
        x ^= (x << 13);
        x ^= (x >>> 7);
        x ^= (x << 17);
        return x;
    }

    // TODO(공통화 대상): 이 내부 클래스 FishingEventSession은 "낚시 전용"이 아니라
    // roomId당 '진행 중 이벤트 1개'를 관리하기 위한 "이벤트 엔진 세션 래퍼"에 가깝다.
    //
    // [현재 용도]
    // - roomId/actorId/startAt/expiresAt/seed : 이벤트 생명주기와 판정 기준 시간 관리
    // - resolved(AtomicBoolean) : timeout과 마지막 action이 동시에 오더라도 결과가 1번만 나가게 보장(resolveOnce)
    // - timeoutFuture : Scheduled timeout 예약을 취소하기 위해 보관
    // - data(FishingSession) : 이벤트별 전용 데이터(낚시는 FishingSession) 를 붙여서 운용
    //
    // [왜 공통으로 빼야 하나]
    // - 낚시/상점/대출/기타 이벤트가 모두 "세션 1개 + timeout + resolveOnce" 패턴을 공유한다.
    // - 이벤트마다 이 래퍼를 각자 만들면
    //   1) 중복 결과(2번 브로드캐스트) 버그가 이벤트마다 재발하고
    //   2) timeout 누락/취소 누락 같은 운영 버그가 누적되며
    //   3) 프론트는 이벤트별로 다른 동작을 처리해야 해서 분기 지옥이 된다.
    // - 공통 엔진에서 한 번만 구현하면 모든 이벤트가 안정적으로 동일한 생명주기 규칙을 갖게 된다.
    private static class FishingEventSession {
        private final Long roomId;
        private final Long actorId;
        private final long eventStartTimeMs;
        private final long expiresAtEpochMs;
        private final long seed;

        private final FishingSession data;

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