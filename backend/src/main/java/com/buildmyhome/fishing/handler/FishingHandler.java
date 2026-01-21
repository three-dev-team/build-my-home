package com.buildmyhome.fishing.handler;

import com.buildmyhome.fishing.dto.FishingEventMessage;
import com.buildmyhome.fishing.model.FishingSession;
import com.buildmyhome.game.dto.HarvestType;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

// 낚시 이벤트 판정 로직
// 클라이언트 액션을 입력으로 받아 진행 상태를 계산하고 UPDATE/RESULT 메시지를 생성
@Component
public class FishingHandler {

    private static final String EVENT_TYPE_FISHING = "FISHING"; // 룸 이벤트 타입 식별자

    // actions
    private static final String ACTION_HIT = "HIT"; // SMALL/MEDIUM 타격 입력
    private static final String ACTION_REEL_START = "REEL_START"; // LARGE 릴 감기 시작 입력
    private static final String ACTION_REEL_STOP = "REEL_STOP"; // LARGE 릴 감기 종료 입력

    // MEDIUM
    private static final int MEDIUM_STAGE_1 = 1; // MEDIUM 1단계
    private static final int MEDIUM_STAGE_2 = 2; // MEDIUM 2단계
    private static final long MEDIUM_HIT_DEBOUNCE_MS = 150L; // MEDIUM HIT 최소 입력 간격(ms), 과도한 연타/메시지 폭주 방지용

    // SMALL
    private static final long SMALL_HIT_DEBOUNCE_MS = 80L; // SMALL HIT 최소 입력 간격(ms), MEDIUM보다 짧게 잡아 기회 느낌 유지

    // LARGE
    private static final double LARGE_PROGRESS_GOAL = 100.0; // LARGE 성공 목표 진행도
    private static final double LARGE_TENSION_MAX = 100.0; // LARGE 실패 장력 임계값

    private static final long LARGE_MIN_PUMP_INTERVAL_MS = 250L; // 펌프(START->STOP) 최소 간격(ms), 너무 빠른 펌프 패널티 기준
    private static final double LARGE_FAST_PUMP_PROGRESS_MULT = 0.35; // 너무 빠른 펌프 진행도 보정 배수, 진행도 증가량 감소용
    private static final double LARGE_FAST_PUMP_TENSION_MULT = 1.6; // 너무 빠른 펌프 장력 보정 배수, 장력 증가량 증가용

    // STARTED 파라미터 생성
    // 프론트 렌더링에 필요한 최소 파라미터 제공
    public Map<String, Object> buildStartedParams(FishingSession data) {
        Map<String, Object> params = new HashMap<>();
        if (data == null) return params;

        HarvestType ht = data.getHarvestType();
        params.put("harvestType", ht != null ? ht.name() : null);

        // SMALL/MEDIUM 게이지 파라미터
        params.put("gaugeCycleMs", data.getGaugeCycleMs()); // 핑퐁 게이지 왕복 주기(ms)
        params.put("firstWindowCenterPct", data.getFirstWindowCenterPct()); // 1단계 성공 구간 중심(%)
        params.put("firstWindowWidthPct", data.getFirstWindowWidthPct()); // 1단계 성공 구간 폭(%)
        params.put("secondWindowCenterPct", data.getSecondWindowCenterPct()); // 2단계 성공 구간 중심(%)
        params.put("secondWindowWidthPct", data.getSecondWindowWidthPct()); // 2단계 성공 구간 폭(%)

        if (ht == HarvestType.FISH_MEDIUM) {
            params.put("stageCount", 2); // MEDIUM 단계 수
            params.put("stage", data.getStage()); // 현재 단계
        }

        // LARGE 스냅샷 및 펌프 파라미터
        if (ht == HarvestType.FISH_LARGE) {
            params.put("progressGoal", LARGE_PROGRESS_GOAL); // 목표 진행도
            params.put("tensionMax", LARGE_TENSION_MAX); // 장력 임계값

            params.put("progress", data.getProgress()); // 현재 진행도
            params.put("tension", data.getTension()); // 현재 장력
            params.put("reeling", data.isReeling()); // 감는 중 여부

            params.put("pumpProgress", data.getPumpProgress()); // 펌프 1회당 진행도 증가량
            params.put("pumpTension", data.getPumpTension()); // 펌프 1회당 장력 증가량
            params.put("tensionCooldownPerMs", data.getTensionCooldownPerMs()); // 정지 시간 1ms당 장력 감소량
            params.put("minPumpIntervalMs", LARGE_MIN_PUMP_INTERVAL_MS); // 최소 펌프 간격
        }

        return params;
    }

    // 액션 1회 처리
    // 시작 전 입력 무시
    // 만료 후 입력 실패 결과 반환
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

    // 시간 초과 처리
    // 기본 실패 결과 반환
    public FishingEventMessage handleTimeout(Long roomId, Long actorId, long nowTimeMs, FishingSession data) {
        return buildFailResult(roomId, actorId, data, "시간 초과로 실패했어!");
    }

    // SMALL 판정 처리
    // HIT 성공 시 RESULT
    // HIT 실패 시 UPDATE 후 진행 지속
    private ActionOutcome handleSmall(
            long eventStartTimeMs,
            long nowTimeMs,
            Long roomId,
            Long actorId,
            FishingSession data,
            String action
    ) {
        if (!ACTION_HIT.equals(action)) return ActionOutcome.noop();

        // 너무 빠른 연타 무시
        long last = data.getLastHitActionEpochMs();
        if (last > 0 && (nowTimeMs - last) < SMALL_HIT_DEBOUNCE_MS) {
            return ActionOutcome.noop();
        }
        data.setLastHitActionEpochMs(nowTimeMs);

        boolean inWindow = isPingPongWindowHit(eventStartTimeMs, nowTimeMs, data, false);
        if (inWindow) {
            return ActionOutcome.resultOnly(buildSuccessResult(roomId, actorId, data, "낚시 성공! 송사리를 낚았다!"));
        }

        FishingEventMessage update = buildUpdateMessage(roomId, actorId, nowTimeMs, data, "미스!");
        return ActionOutcome.updateOnly(update);
    }

    // MEDIUM 판정 처리
    // 1단계 성공 시 2단계 전환 UPDATE
    // 2단계 성공 시 RESULT
    // 미스 시 UPDATE 후 진행 지속
    private ActionOutcome handleMedium(
            long eventStartTimeMs,
            long nowTimeMs,
            Long roomId,
            Long actorId,
            FishingSession data,
            String action
    ) {
        if (!ACTION_HIT.equals(action)) return ActionOutcome.noop();

        // 너무 빠른 연타 무시
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
            boolean ok = isPingPongWindowHit(eventStartTimeMs, nowTimeMs, data, false);
            if (!ok) {
                FishingEventMessage update = buildUpdateMessage(roomId, actorId, nowTimeMs, data, "미스!");
                return ActionOutcome.updateOnly(update);
            }

            data.setStage(MEDIUM_STAGE_2);
            FishingEventMessage update = buildUpdateMessage(roomId, actorId, nowTimeMs, data, "좋아! 2단계!");
            return ActionOutcome.updateOnly(update);
        }

        boolean ok = isPingPongWindowHit(eventStartTimeMs, nowTimeMs, data, true);
        if (ok) {
            return ActionOutcome.resultOnly(buildSuccessResult(roomId, actorId, data, "낚시 성공! 가자미를 낚았다!"));
        }

        FishingEventMessage update = buildUpdateMessage(roomId, actorId, nowTimeMs, data, "미스!");
        return ActionOutcome.updateOnly(update);
    }

    // 게이지 성공 구간 판정
    // 현재 마커 퍼센트 계산 후 성공 구간 포함 여부 반환
    private boolean isPingPongWindowHit(long eventStartTimeMs, long nowTimeMs, FishingSession data, boolean stage2) {
        long cycleMs = data.getGaugeCycleMs();
        if (cycleMs <= 0) {
            // 핑퐁 게이지 파라미터가 없으면 판정 불가
            return false;
        }

        // startAtEpochMs가 비정상일 때 eventStartTimeMs로 보정
        long startAt = (data.getStartAtEpochMs() > 0) ? data.getStartAtEpochMs() : eventStartTimeMs;
        double markerPct = computeGaugeMarkerPct(startAt, nowTimeMs, cycleMs);

        double center = stage2 ? data.getSecondWindowCenterPct() : data.getFirstWindowCenterPct();
        double width = stage2 ? data.getSecondWindowWidthPct() : data.getFirstWindowWidthPct();
        if (width <= 0) return false;

        double half = width / 2.0;
        double start = clamp0to100(center - half);
        double end = clamp0to100(center + half);

        return start <= markerPct && markerPct <= end;
    }

    // 게이지 마커 퍼센트 계산
    // 핑퐁 형태 0->100->0 이동
    private double computeGaugeMarkerPct(long startAtEpochMs, long nowEpochMs, long cycleMs) {
        long elapsed = Math.max(0, nowEpochMs - startAtEpochMs);
        long mod = cycleMs > 0 ? (elapsed % cycleMs) : 0;

        double phase = cycleMs > 0 ? (mod / (double) cycleMs) : 0.0; // 0..1
        if (phase <= 0.5) {
            return clamp0to100(phase * 2.0 * 100.0); // 0 -> 100
        }
        return clamp0to100((1.0 - (phase - 0.5) * 2.0) * 100.0); // 100 -> 0
    }

    // 0~100 범위 클램프
    private double clamp0to100(double v) {
        if (v < 0) return 0;
        if (v > 100) return 100;
        return v;
    }

    // LARGE 판정 처리
    // REEL_START는 감기 시작 상태 반영 UPDATE
    // REEL_STOP은 펌프 1회 판정 후 UPDATE 및 조건 충족 시 RESULT
    private ActionOutcome handleLarge(
            long nowTimeMs,
            Long roomId,
            Long actorId,
            FishingSession data,
            String action
    ) {
        if (ACTION_HIT.equals(action)) return ActionOutcome.noop();

        if (ACTION_REEL_START.equals(action)) {
            applyCooldownIfNeeded(data, nowTimeMs);

            data.setReeling(true);
            data.setLastStateUpdateEpochMs(nowTimeMs);

            FishingEventMessage update = buildUpdateMessage(roomId, actorId, nowTimeMs, data);
            return ActionOutcome.updateOnly(update);
        }

        if (ACTION_REEL_STOP.equals(action)) {
            applyCooldownIfNeeded(data, nowTimeMs);

            data.setReeling(false);

            // 마지막 펌프 이후 경과 시간 기준
            long lastPump = data.getLastPumpEpochMs();
            long dtFromLastPump = (lastPump > 0) ? (nowTimeMs - lastPump) : Long.MAX_VALUE;

            double pGain = data.getPumpProgress();
            double tGain = data.getPumpTension();

            // 최소 간격보다 빠르면 패널티 적용
            if (dtFromLastPump < LARGE_MIN_PUMP_INTERVAL_MS) {
                pGain *= LARGE_FAST_PUMP_PROGRESS_MULT;
                tGain *= LARGE_FAST_PUMP_TENSION_MULT;
            }

            data.setProgress(clamp0to100(data.getProgress() + pGain));
            data.setTension(clamp0to100(data.getTension() + tGain));
            data.setLastPumpEpochMs(nowTimeMs);
            data.setLastStateUpdateEpochMs(nowTimeMs);

            FishingEventMessage update = buildUpdateMessage(roomId, actorId, nowTimeMs, data);

            FishingEventMessage result = evaluateLargeResult(roomId, actorId, data);
            if (result != null) {
                return ActionOutcome.updateAndResult(update, result);
            }
            return ActionOutcome.updateOnly(update);
        }

        return ActionOutcome.noop();
    }

    // LARGE 쿨다운 적용
    // reeling=false 구간의 정지 시간만큼 tension 감소
    private void applyCooldownIfNeeded(FishingSession data, long nowEpochMs) {
        if (data.isReeling()) return;

        long last = data.getLastStateUpdateEpochMs();
        if (last <= 0) {
            data.setLastStateUpdateEpochMs(nowEpochMs);
            return;
        }

        long dt = nowEpochMs - last;
        if (dt <= 0) return;

        double cool = data.getTensionCooldownPerMs();
        if (cool <= 0) {
            data.setLastStateUpdateEpochMs(nowEpochMs);
            return;
        }

        double next = data.getTension() - (cool * dt);
        data.setTension(clamp0to100(next));
        data.setLastStateUpdateEpochMs(nowEpochMs);
    }

    // LARGE 성공/실패 판정
    // tension 임계 초과 시 실패
    // progress 목표 도달 시 성공
    private FishingEventMessage evaluateLargeResult(Long roomId, Long actorId, FishingSession data) {
        if (data.getTension() >= LARGE_TENSION_MAX) {
            return buildFailResult(roomId, actorId, data, "장력이 너무 높아! 줄이 끊어졌어…");
        }

        if (data.getProgress() >= LARGE_PROGRESS_GOAL) {
            return buildSuccessResult(roomId, actorId, data, "낚시 성공!! 개복치를 낚았다!!");
        }

        return null;
    }

    // UPDATE 메시지 생성
    // stage/progress/tension/reeling 스냅샷 포함
    private FishingEventMessage buildUpdateMessage(Long roomId, Long actorId, long nowEpochMs, FishingSession data) {
        return buildUpdateMessage(roomId, actorId, nowEpochMs, data, null);
    }

    // UPDATE 메시지 생성
    // message 포함 버전
    private FishingEventMessage buildUpdateMessage(Long roomId, Long actorId, long nowEpochMs, FishingSession data, String message) {
        return FishingEventMessage.builder()
                .type("ROOM_EVENT_UPDATE")
                .eventType(EVENT_TYPE_FISHING)
                .roomId(roomId)
                .actorMemberId(actorId)
                .stage(data != null ? data.getStage() : null)
                .progress(data != null ? data.getProgress() : null)
                .tension(data != null ? data.getTension() : null)
                .reeling(data != null && data.isReeling())
                .message(message)
                .serverTimeMs(nowEpochMs)
                .build();
    }

    // 성공 RESULT 메시지 생성
    // 보상 수량 차등 적용
    private FishingEventMessage buildSuccessResult(Long roomId, Long actorId, FishingSession data, String msg) {
        return FishingEventMessage.builder()
                .type("ROOM_EVENT_RESULT")
                .eventType(EVENT_TYPE_FISHING)
                .roomId(roomId)
                .actorMemberId(actorId)
                .success(true)
                .harvestType(data.getHarvestType().name())
                .gainedQty(gainedQtyFor(data.getHarvestType()))
                .message(msg)
                .build();
    }

    // 수확 타입별 획득 수량 결정
    private int gainedQtyFor(HarvestType ht) {
        if (ht == null) return 0;
        return switch (ht) {
            case FISH_SMALL -> 1;
            case FISH_MEDIUM -> 2;
            case FISH_LARGE -> 3;
            default -> 1;
        };
    }

    // 실패 RESULT 메시지 생성
    // gainedQty=0 고정
    private FishingEventMessage buildFailResult(Long roomId, Long actorId, FishingSession data, String msg) {
        String harvestType = (data != null && data.getHarvestType() != null) ? data.getHarvestType().name() : null;

        return FishingEventMessage.builder()
                .type("ROOM_EVENT_RESULT")
                .eventType(EVENT_TYPE_FISHING)
                .roomId(roomId)
                .actorMemberId(actorId)
                .success(false)
                .harvestType(harvestType)
                .gainedQty(0)
                .message(msg)
                .build();
    }

    // 액션 처리 결과 래핑
    // updateMessage/resultMessage 단독 또는 동시 반환
    public static class ActionOutcome {
        private final FishingEventMessage updateMessage;
        private final FishingEventMessage resultMessage;

        private ActionOutcome(FishingEventMessage updateMessage, FishingEventMessage resultMessage) {
            this.updateMessage = updateMessage;
            this.resultMessage = resultMessage;
        }

        public FishingEventMessage updateMessage() {
            return updateMessage;
        }

        public FishingEventMessage resultMessage() {
            return resultMessage;
        }

        public static ActionOutcome noop() {
            return new ActionOutcome(null, null);
        }

        public static ActionOutcome updateOnly(FishingEventMessage update) {
            return new ActionOutcome(update, null);
        }

        public static ActionOutcome resultOnly(FishingEventMessage result) {
            return new ActionOutcome(null, result);
        }

        public static ActionOutcome updateAndResult(FishingEventMessage update, FishingEventMessage result) {
            return new ActionOutcome(update, result);
        }
    }
}
