package com.buildmyhome.fishing.handler;

import com.buildmyhome.fishing.dto.RoomEventResultMessage;
import com.buildmyhome.fishing.dto.RoomEventUpdateMessage;
import com.buildmyhome.fishing.model.FishingSession;
import com.buildmyhome.game.dto.HarvestType;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

// 낚시 판정 로직(도메인 규칙)을 담당
// 지금 이 액션이 성공/실패인지를 계산해 UPDATE/RESULT 메시지로 돌려줌
@Component
public class FishingHandler {

    private static final String EVENT_TYPE_FISHING = "FISHING";

    // actions
    private static final String ACTION_HIT = "HIT";
    private static final String ACTION_REEL_START = "REEL_START";
    private static final String ACTION_REEL_STOP = "REEL_STOP";
    private static final String ACTION_TICK = "TICK";

    // MEDIUM
    private static final int MEDIUM_STAGE_1 = 1;
    private static final int MEDIUM_STAGE_2 = 2;
    private static final long MEDIUM_HIT_DEBOUNCE_MS = 150L;

    // LARGE
    private static final double LARGE_PROGRESS_GOAL = 100.0;
    private static final double LARGE_TENSION_MAX = 100.0;

    /**
     *  시작 시 프론트가 렌더링에 필요한 최소 파라미터를 내려줌
     * - SMALL: firstBiteDelayMs / firstSuccessDurationMs
     * - MEDIUM: first+second + stageCount(=2)
     * - LARGE: progress/tension 파라미터(릴링)
     */
    public Map<String, Object> buildStartedParams(FishingSession data) {
        Map<String, Object> params = new HashMap<>();

        // null 일 때
        if (data == null) return params;

        HarvestType ht = data.getHarvestType();
        params.put("harvestType", ht != null ? ht.name() : null);

        // 작물타입이 작은 물고기 일 때
        if (ht == HarvestType.FISH_SMALL) {
            params.put("firstBiteDelayMs", data.getFirstBiteDelayMs());
            params.put("firstSuccessDurationMs", data.getFirstSuccessDurationMs());
            return params;
        }

        // 작물타입이 중간 물고기 일 때
        if (ht == HarvestType.FISH_MEDIUM) {
            params.put("stageCount", 2);
            params.put("stage", data.getStage());

            params.put("firstBiteDelayMs", data.getFirstBiteDelayMs());
            params.put("firstSuccessDurationMs", data.getFirstSuccessDurationMs());

            params.put("secondBiteDelayMs", data.getSecondBiteDelayMs());
            params.put("secondSuccessDurationMs", data.getSecondSuccessDurationMs());
            return params;
        }

        // // 작물타입이 큰 물고기 일 때
        if (ht == HarvestType.FISH_LARGE) {
            params.put("progressGoal", LARGE_PROGRESS_GOAL);
            params.put("tensionMax", LARGE_TENSION_MAX);

            params.put("progress", data.getProgress());
            params.put("tension", data.getTension());
            params.put("reeling", data.isReeling());

            params.put("progressPerMs", data.getProgressPerMs());
            params.put("tensionUpPerMs", data.getTensionUpPerMs());
            params.put("tensionDownPerMs", data.getTensionDownPerMs());
            return params;
        }

        return params;
    }

    /**
     * 소/중/대 타입별 판정
     * - SMALL: HIT 타이밍 1회
     * - MEDIUM: HIT 2단계(stage 1 -> stage 2)
     * - LARGE: REEL_START/REEL_STOP + 서버 tick(TICK)로 progress/tension 업데이트
     * LARGE의 TICK은 유저가 보내는 게 아니라,
     * FishingService에서 scheduler로 주기적으로 handleAction(..., action="TICK")을 호출해주는 방식
     */
    public ActionOutcome handleAction(
            long eventStartTimeMs,
            long expiresAtTimeMs,
            long nowTimeMs,
            Long roomId,
            Long actorId,
            FishingSession data,
            String action
    ) {
        if (data == null) return ActionOutcome.noop();
        if (action == null) return ActionOutcome.noop();

        if (nowTimeMs < eventStartTimeMs) return ActionOutcome.noop();

        if (nowTimeMs >= expiresAtTimeMs) {
            return ActionOutcome.resultOnly(buildFailResult(roomId, actorId, data, "시간 초과로 실패했어!"));
        }

        HarvestType ht = data.getHarvestType();
        if (ht == null) return ActionOutcome.noop();

        if (ht == HarvestType.FISH_SMALL) {
            return handleSmall(eventStartTimeMs, nowTimeMs, roomId, actorId, data, action);
        }

        if (ht == HarvestType.FISH_MEDIUM) {
            return handleMedium(eventStartTimeMs, nowTimeMs, roomId, actorId, data, action);
        }

        if (ht == HarvestType.FISH_LARGE) {
            return handleLarge(nowTimeMs, roomId, actorId, data, action);
        }

        return ActionOutcome.noop();
    }

    public RoomEventResultMessage handleTimeout(Long roomId, Long actorId, long nowTimeMs, FishingSession data) {
        // 시간 초과는 무조건 실패 결과
        return buildFailResult(roomId, actorId, data, "시간 초과로 실패했어!");
    }

    // SMALL
    private ActionOutcome handleSmall(
            long eventStartTimeMs,
            long nowTimeMs,
            Long roomId,
            Long actorId,
            FishingSession data,
            String action
    ) {
        if (!ACTION_HIT.equals(action)) return ActionOutcome.noop();

        long elapsedMs = nowTimeMs - eventStartTimeMs;

        boolean success =
                (data.getFirstBiteDelayMs() <= elapsedMs)
                        && (elapsedMs <= data.getFirstBiteDelayMs() + data.getFirstSuccessDurationMs());

        if (success) {
            return ActionOutcome.resultOnly(buildSuccessResult(roomId, actorId, data, "낚시 성공! 송사리를 낚았다!"));
        }
        return ActionOutcome.resultOnly(buildFailResult(roomId, actorId, data, "앗! 타이밍이 빗나갔어!"));
    }

    // MEDIUM (2-stage HIT)
    private ActionOutcome handleMedium(
            long eventStartTimeMs,
            long nowTimeMs,
            Long roomId,
            Long actorId,
            FishingSession data,
            String action
    ) {
        if (!ACTION_HIT.equals(action)) return ActionOutcome.noop();

        // 연타(더블 클릭) 방지
        long last = data.getLastHitActionEpochMs();
        if (last > 0 && (nowTimeMs - last) < MEDIUM_HIT_DEBOUNCE_MS) {
            return ActionOutcome.noop();
        }
        data.setLastHitActionEpochMs(nowTimeMs);

        int stage = data.getStage();
        if (stage != MEDIUM_STAGE_1 && stage != MEDIUM_STAGE_2) {
            stage = MEDIUM_STAGE_1;
            data.setStage(MEDIUM_STAGE_1);
        }

        if (stage == MEDIUM_STAGE_1) {
            boolean ok = inWindow(eventStartTimeMs, nowTimeMs, data.getFirstBiteDelayMs(), data.getFirstSuccessDurationMs());
            if (!ok) {
                return ActionOutcome.resultOnly(buildFailResult(roomId, actorId, data, "1단계 타이밍 실패!"));
            }

            // stage 2로 전환 + UPDATE 브로드캐스트
            data.setStage(MEDIUM_STAGE_2);

            RoomEventUpdateMessage update = RoomEventUpdateMessage.builder()
                    .type("ROOM_EVENT_UPDATE")
                    .eventType(EVENT_TYPE_FISHING)
                    .roomId(roomId)
                    .actorMemberId(actorId)
                    .stage(MEDIUM_STAGE_2)
                    .serverTimeMs(nowTimeMs)
                    .build();

            return ActionOutcome.updateOnly(update);
        }

        // stage 2
        boolean ok = inWindow(eventStartTimeMs, nowTimeMs, data.getSecondBiteDelayMs(), data.getSecondSuccessDurationMs());
        if (ok) {
            return ActionOutcome.resultOnly(buildSuccessResult(roomId, actorId, data, "낚시 성공! 가자미를 낚았다!"));
        }
        return ActionOutcome.resultOnly(buildFailResult(roomId, actorId, data, "2단계 타이밍 실패!"));
    }

    // 타이밍 성공 구간 안이 맞는지를 계산하는 공용 체크 함수
    private boolean inWindow(long eventStartTimeMs, long nowTimeMs, long biteDelayMs, long successDurationMs) {
        long elapsedMs = nowTimeMs - eventStartTimeMs;
        return biteDelayMs <= elapsedMs && elapsedMs <= (biteDelayMs + successDurationMs);
    }

    // 큰 물고기 릴링 게임에서 들어온 액션을 처리하고 UPDATE/RESULT를 만들어주는 함수
    private ActionOutcome handleLarge(
            long nowTimeMs,
            Long roomId,
            Long actorId,
            FishingSession data,
            String action
    ) {
        // LARGE는 HIT 무시
        if (ACTION_HIT.equals(action)) return ActionOutcome.noop();

        // state 업데이트 (dt 기반)
        // -> 실제 흐른 시간(dt) 기준으로 progress/tension을 계산하는 방식
        if (ACTION_REEL_START.equals(action)) {
            // 현재까지 반영 후 reeling=true로 전환
            updateLargeState(data, nowTimeMs);
            data.setReeling(true);

            RoomEventUpdateMessage update = buildLargeUpdate(roomId, actorId, data, nowTimeMs);
            return ActionOutcome.updateOnly(update);
        }

        if (ACTION_REEL_STOP.equals(action)) {
            // 현재까지 반영 후 reeling=false로 전환
            updateLargeState(data, nowTimeMs);
            data.setReeling(false);

            RoomEventUpdateMessage update = buildLargeUpdate(roomId, actorId, data, nowTimeMs);
            return ActionOutcome.updateOnly(update);
        }

        if (ACTION_TICK.equals(action)) {
            updateLargeState(data, nowTimeMs);

            // 성공/실패 판정
            if (data.getTension() >= LARGE_TENSION_MAX) {
                RoomEventUpdateMessage update = buildLargeUpdate(roomId, actorId, data, nowTimeMs);
                RoomEventResultMessage result = buildFailResult(roomId, actorId, data, "장력이 너무 높아! 줄이 끊어졌어…");
                return ActionOutcome.updateAndResult(update, result);
            }

            if (data.getProgress() >= LARGE_PROGRESS_GOAL) {
                RoomEventUpdateMessage update = buildLargeUpdate(roomId, actorId, data, nowTimeMs);
                RoomEventResultMessage result = buildSuccessResult(roomId, actorId, data, "낚시 성공!! 개복치를 낚았다!!");
                return ActionOutcome.updateAndResult(update, result);
            }

            RoomEventUpdateMessage update = buildLargeUpdate(roomId, actorId, data, nowTimeMs);
            return ActionOutcome.updateOnly(update);
        }

        return ActionOutcome.noop();
    }

    // LARGE 상태 업데이트를 처음 호출했을 때, dt 계산이 폭발하지 않도록 마지막 업데이트 시각을 초기화만 해주는 가드(초기화 처리)
    private void updateLargeState(FishingSession data, long nowEpochMs) {
        long last = data.getLastStateUpdateEpochMs();
        if (last <= 0) {
            data.setLastStateUpdateEpochMs(nowEpochMs);
            return;
        }

        long dt = nowEpochMs - last;
        if (dt <= 0) return;

        double progress = data.getProgress();
        double tension = data.getTension();

        if (data.isReeling()) {
            progress += data.getProgressPerMs() * dt;
            tension += data.getTensionUpPerMs() * dt;
        } else {
            tension -= data.getTensionDownPerMs() * dt;
        }

        // clamp : 계산 결과가 0~100 범위를 벗어나면 그 범위로 잘라서 고정하는 것
        if (progress < 0) progress = 0;
        if (progress > 100) progress = 100;

        if (tension < 0) tension = 0;
        if (tension > 100) tension = 100;

        data.setProgress(progress);
        data.setTension(tension);
        data.setLastStateUpdateEpochMs(nowEpochMs);
    }

    private RoomEventUpdateMessage buildLargeUpdate(Long roomId, Long actorId, FishingSession data, long serverTimeMs) {
        return RoomEventUpdateMessage.builder()
                .type("ROOM_EVENT_UPDATE")
                .eventType(EVENT_TYPE_FISHING)
                .roomId(roomId)
                .actorMemberId(actorId)
                .progress(data.getProgress())
                .tension(data.getTension())
                .reeling(data.isReeling())
                .serverTimeMs(serverTimeMs)
                .build();
    }

    // RESULT builders
    private RoomEventResultMessage buildSuccessResult(Long roomId, Long actorId, FishingSession data, String msg) {
        return RoomEventResultMessage.builder()
                .type("ROOM_EVENT_RESULT")
                .eventType(EVENT_TYPE_FISHING)
                .roomId(roomId)
                .actorMemberId(actorId)
                .success(true)
                .harvestType(data.getHarvestType().name())
                .gainedQty(1)
                .message(msg)
                .build();
    }

    private RoomEventResultMessage buildFailResult(Long roomId, Long actorId, FishingSession data, String msg) {
        return RoomEventResultMessage.builder()
                .type("ROOM_EVENT_RESULT")
                .eventType(EVENT_TYPE_FISHING)
                .roomId(roomId)
                .actorMemberId(actorId)
                .success(false)
                .harvestType(data.getHarvestType().name())
                .gainedQty(0)
                .message(msg)
                .build();
    }

    // Outcome
    public static class ActionOutcome {
        private final RoomEventUpdateMessage updateMessage;
        private final RoomEventResultMessage resultMessage;

        private ActionOutcome(RoomEventUpdateMessage updateMessage, RoomEventResultMessage resultMessage) {
            this.updateMessage = updateMessage;
            this.resultMessage = resultMessage;
        }

        public RoomEventUpdateMessage updateMessage() {
            return updateMessage;
        }

        public RoomEventResultMessage resultMessage() {
            return resultMessage;
        }

        public static ActionOutcome noop() {
            return new ActionOutcome(null, null);
        }

        public static ActionOutcome updateOnly(RoomEventUpdateMessage update) {
            return new ActionOutcome(update, null);
        }

        public static ActionOutcome resultOnly(RoomEventResultMessage result) {
            return new ActionOutcome(null, result);
        }

        public static ActionOutcome updateAndResult(RoomEventUpdateMessage update, RoomEventResultMessage result) {
            return new ActionOutcome(update, result);
        }
    }
}