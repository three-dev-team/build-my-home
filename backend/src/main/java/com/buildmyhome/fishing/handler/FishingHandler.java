package com.buildmyhome.fishing.handler;

import com.buildmyhome.fishing.dto.RoomEventResultMessage;
import com.buildmyhome.fishing.dto.RoomEventUpdateMessage;
import com.buildmyhome.fishing.model.FishingSession;
import com.buildmyhome.game.dto.GamePlayerState;
import com.buildmyhome.game.dto.GameState;
import com.buildmyhome.game.dto.GameStatus;
import com.buildmyhome.game.dto.HarvestType;
import com.buildmyhome.game.service.GameStateService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class FishingHandler {

    private final GameStateService gameStateService;

    public Map<String, Object> buildStartedParams(FishingSession data) {
        Map<String, Object> params = new HashMap<>();

        // FishingSession 필드명에 맞춤
        params.put("firstBiteDelayMs", data.getFirstBiteDelayMs());
        params.put("firstSuccessDurationMs", data.getFirstSuccessDurationMs());

        if ("FISH_MEDIUM".equals(data.getHarvestType())) {
            params.put("secondBiteDelayMs", data.getSecondBiteDelayMs());
            params.put("secondSuccessDurationMs", data.getSecondSuccessDurationMs());
        }

        if ("FISH_LARGE".equals(data.getHarvestType())) {
            params.put("progressPerSec", data.getProgressPerMs() * 1000.0);
            params.put("tensionUpPerSec", data.getTensionUpPerMs() * 1000.0);
            params.put("tensionDownPerSec", data.getTensionDownPerMs() * 1000.0);
        }

        return params;
    }

    public ActionOutcome handleAction(
            long eventStartTimeMs,
            long expiresAtTimeMs,
            long nowTimeMs,
            Long roomId,
            Long actorId,
            FishingSession data,
            String action
    ) {
        if (nowTimeMs < eventStartTimeMs) return ActionOutcome.noop();

        if (nowTimeMs >= expiresAtTimeMs) {
            return new ActionOutcome(null, buildFailResult(roomId, actorId, data, "시간 초과로 실패했어!"));
        }

        // SMALL/MEDIUM은 HIT만 유효 (최소 방어)
        if (("FISH_SMALL".equals(data.getHarvestType()) || "FISH_MEDIUM".equals(data.getHarvestType()))
                && !"HIT".equals(action)) {
            return ActionOutcome.noop();
        }

        return switch (data.getHarvestType()) {
            case "FISH_SMALL" -> handleSmall(eventStartTimeMs, nowTimeMs, roomId, actorId, data);
            case "FISH_MEDIUM" -> handleMedium(eventStartTimeMs, nowTimeMs, roomId, actorId, data);
            case "FISH_LARGE" -> handleLarge(nowTimeMs, roomId, actorId, data, action);
            default -> new ActionOutcome(null, buildFailResult(roomId, actorId, data, "알 수 없는 낚시 타입입니다."));
        };
    }

    public RoomEventResultMessage handleTimeout(Long roomId, Long actorId, long nowTimeMs, FishingSession data) {
        if ("FISH_LARGE".equals(data.getHarvestType())) {
            updateLargeByDt(data, nowTimeMs);
        }
        return buildFailResult(roomId, actorId, data, "시간 초과로 실패했어!");
    }

    /* ---------------- SMALL ---------------- */

    private ActionOutcome handleSmall(long eventStartTimeMs, long nowTimeMs, Long roomId, Long actorId, FishingSession data) {
        long elapsedMs = nowTimeMs - eventStartTimeMs;

        boolean success =
                (data.getFirstBiteDelayMs() <= elapsedMs)
                        && (elapsedMs <= data.getFirstBiteDelayMs() + data.getFirstSuccessDurationMs());

        if (success) {
            applyReward(roomId, actorId, data.getHarvestType());
            return new ActionOutcome(null, buildSuccessResult(roomId, actorId, data, "타이밍 성공! 물고기 낚았다!"));
        }
        return new ActionOutcome(null, buildFailResult(roomId, actorId, data, "앗! 타이밍이 빗나갔어!"));
    }

    /* ---------------- MEDIUM ---------------- */

    private ActionOutcome handleMedium(long eventStartTimeMs, long nowTimeMs, Long roomId, Long actorId, FishingSession data) {
        // MEDIUM 연타 방지
        if (nowTimeMs - data.getLastHitActionAtMs() < 150) return ActionOutcome.noop();
        data.setLastHitActionAtMs(nowTimeMs);

        long elapsedMs = nowTimeMs - eventStartTimeMs;

        if (data.getStage() == 1) {
            boolean ok1 =
                    (data.getFirstBiteDelayMs() <= elapsedMs)
                            && (elapsedMs <= data.getFirstBiteDelayMs() + data.getFirstSuccessDurationMs());

            if (!ok1) {
                return new ActionOutcome(null, buildFailResult(roomId, actorId, data, "1차 타이밍 실패!"));
            }

            data.setStage(2);

            RoomEventUpdateMessage update = RoomEventUpdateMessage.builder()
                    .type("ROOM_EVENT_UPDATE")
                    .eventType("FISHING")
                    .roomId(roomId)
                    .actorMemberId(actorId)
                    .build();

            return new ActionOutcome(update, null);
        }

        boolean ok2 =
                (data.getSecondBiteDelayMs() <= elapsedMs)
                        && (elapsedMs <= data.getSecondBiteDelayMs() + data.getSecondSuccessDurationMs());

        if (ok2) {
            applyReward(roomId, actorId, data.getHarvestType());
            return new ActionOutcome(null, buildSuccessResult(roomId, actorId, data, "연속 타이밍 성공! 물고기 낚았다!"));
        }
        return new ActionOutcome(null, buildFailResult(roomId, actorId, data, "2차 타이밍 실패!"));
    }

    /* ---------------- LARGE ---------------- */

    private ActionOutcome handleLarge(long nowTimeMs, Long roomId, Long actorId, FishingSession data, String action) {
        updateLargeByDt(data, nowTimeMs);

        if ("REEL_START".equals(action)) data.setReeling(true);
        if ("REEL_STOP".equals(action)) data.setReeling(false);

        if (data.getTension() >= 100.0) {
            return new ActionOutcome(null, buildFailResult(roomId, actorId, data, "줄이 팽팽해져서 끊어졌어!"));
        }
        if (data.getProgress() >= 100.0) {
            applyReward(roomId, actorId, data.getHarvestType());
            return new ActionOutcome(null, buildSuccessResult(roomId, actorId, data, "릴링 성공! 큰 물고기 낚았다!"));
        }

        return ActionOutcome.noop();
    }

    private void updateLargeByDt(FishingSession data, long nowTimeMs) {
        long last = data.getLastStateUpdateAtMs();
        long dt = Math.max(0, nowTimeMs - last);

        if (data.isReeling()) {
            data.setProgress(clamp(data.getProgress() + dt * data.getProgressPerMs()));
            data.setTension(clamp(data.getTension() + dt * data.getTensionUpPerMs()));
        } else {
            data.setTension(clamp(data.getTension() - dt * data.getTensionDownPerMs()));
        }

        data.setLastStateUpdateAtMs(nowTimeMs);
    }

    private double clamp(double v) {
        if (v < 0) return 0;
        if (v > 100) return 100;
        return v;
    }

    /* ---------------- RESULT + REWARD ---------------- */

    private RoomEventResultMessage buildSuccessResult(Long roomId, Long actorId, FishingSession data, String msg) {
        // ht는 현재 로직에서 사용하지 않지만, 값 검증용으로 남겨둠(유효하지 않으면 예외 발생)
        HarvestType ht = HarvestType.valueOf(data.getHarvestType());

        return RoomEventResultMessage.builder()
                .type("ROOM_EVENT_RESULT")
                .eventType("FISHING")
                .roomId(roomId)
                .actorMemberId(actorId)
                .success(true)
                .harvestType(data.getHarvestType())
                .gainedQty(1)
                .message(msg)
                .build();
    }

    private RoomEventResultMessage buildFailResult(Long roomId, Long actorId, FishingSession data, String msg) {
        HarvestType ht = HarvestType.valueOf(data.getHarvestType());

        return RoomEventResultMessage.builder()
                .type("ROOM_EVENT_RESULT")
                .eventType("FISHING")
                .roomId(roomId)
                .actorMemberId(actorId)
                .success(false)
                .harvestType(data.getHarvestType())
                .gainedQty(0)
                .message(msg)
                .build();
    }

    private void applyReward(Long roomId, Long actorId, String harvestTypeStr) {
        GameState game = gameStateService.getGame(roomId);
        if (game == null) return;

        synchronized (game) {
            GamePlayerState player = game.getPlayers().get(actorId);
            if (player == null) return;

            HarvestType ht = HarvestType.valueOf(harvestTypeStr);
            Integer prev = player.getHarvests().getOrDefault(ht, 0);
            player.getHarvests().put(ht, prev + 1);

            game.setStatus(GameStatus.TURN_END_PENDING);
        }
    }

    public record ActionOutcome(RoomEventUpdateMessage updateMessage, RoomEventResultMessage resultMessage) {
        public static ActionOutcome noop() {
            return new ActionOutcome(null, null);
        }
    }
}