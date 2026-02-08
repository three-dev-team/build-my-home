package com.buildmyhome.fishing.policy;

import com.buildmyhome.fishing.model.FishingSession;
import com.buildmyhome.game.dto.HarvestType;
import java.util.SplittableRandom; // seed 기반 RNG

// 낚시 이벤트 시작 시 서버 판정에 필요한 랜덤 파라미터를 생성해 FishingSession에 채우는 정책 클래스
public class FishingPolicy {

    // SMALL / MEDIUM 게이지 정책 값
    private static final long SMALL_GAUGE_CYCLE_MS = 1800;
    private static final double SMALL_WINDOW_WIDTH_PCT = 30.0;

    private static final long MEDIUM_GAUGE_CYCLE_MS = 1600;
    private static final double MEDIUM_STAGE1_WINDOW_WIDTH_PCT = 25.0;
    private static final double MEDIUM_STAGE2_WINDOW_WIDTH_PCT = 20.0;

    private static final double WINDOW_CENTER_MIN_PCT = 18.0;
    private static final double WINDOW_CENTER_MAX_PCT = 82.0;

    // LARGE 초기 상태 값
    private static final double LARGE_PROGRESS_START = 0.0;
    private static final double LARGE_TENSION_START = 0.0;

    // LARGE 펌프 1회당 증가량 범위
    private static final double LARGE_PUMP_PROGRESS_MIN = 13.5;
    private static final double LARGE_PUMP_PROGRESS_MAX = 14.5;

    private static final double LARGE_PUMP_TENSION_MIN = 17.0;
    private static final double LARGE_PUMP_TENSION_MAX = 18.0;

    private static final double LARGE_TENSION_COOLDOWN_PER_MS = 0.025;

    private static boolean isSmall(HarvestType ht) {
        return ht == HarvestType.FISH_SMALL_1 || ht == HarvestType.FISH_SMALL_2;
    }

    private static boolean isMedium(HarvestType ht) {
        return ht == HarvestType.FISH_MEDIUM_1 || ht == HarvestType.FISH_MEDIUM_2;
    }

    private static boolean isLargeLike(HarvestType ht) {
        return ht == HarvestType.FISH_LARGE || ht == HarvestType.FISH_RARE;
    }

    // 낚시 타입에 맞는 세션 데이터를 생성하는 메소드
    // seed를 기반으로 동일한 seed면 동일한 룰이 생성되도록 보장
    public static FishingSession createSessionData(HarvestType harvestType, long seed, long startAtEpochMs) {
        FishingSession data = new FishingSession();
        data.setHarvestType(harvestType);

        SplittableRandom rng = new SplittableRandom(seed);

        // 공통 필드
        data.setStartAtEpochMs(startAtEpochMs);
        data.setStage(1);
        data.setLastHitActionEpochMs(0);

        // 핑퐁 게이지 파라미터 초기화
        data.setGaugeCycleMs(0);
        data.setFirstWindowCenterPct(0);
        data.setFirstWindowWidthPct(0);
        data.setSecondWindowCenterPct(0);
        data.setSecondWindowWidthPct(0);

        // LARGE 펌프 파라미터 초기화
        data.setProgress(0);
        data.setTension(0);
        data.setReeling(false);
        data.setLastStateUpdateEpochMs(startAtEpochMs);

        data.setPumpProgress(0);
        data.setPumpTension(0);
        data.setTensionCooldownPerMs(0);
        data.setLastPumpEpochMs(0);

        if (harvestType == null) return data;

        // 분기: SMALL / MEDIUM / LARGE(or RARE)
        if (isSmall(harvestType)) {
            data.setGaugeCycleMs(SMALL_GAUGE_CYCLE_MS);

            double c = randDoubleRange(rng, WINDOW_CENTER_MIN_PCT, WINDOW_CENTER_MAX_PCT);
            data.setFirstWindowCenterPct(c);
            data.setFirstWindowWidthPct(SMALL_WINDOW_WIDTH_PCT);

            data.setSecondWindowCenterPct(0);
            data.setSecondWindowWidthPct(0);

            data.setStage(1);
            return data;
        }

        if (isMedium(harvestType)) {
            data.setGaugeCycleMs(MEDIUM_GAUGE_CYCLE_MS);

            double c1 = randDoubleRange(rng, WINDOW_CENTER_MIN_PCT, WINDOW_CENTER_MAX_PCT);
            data.setFirstWindowCenterPct(c1);
            data.setFirstWindowWidthPct(MEDIUM_STAGE1_WINDOW_WIDTH_PCT);

            double c2 = randDoubleRange(rng, WINDOW_CENTER_MIN_PCT, WINDOW_CENTER_MAX_PCT);
            data.setSecondWindowCenterPct(c2);
            data.setSecondWindowWidthPct(MEDIUM_STAGE2_WINDOW_WIDTH_PCT);

            data.setStage(1);
            return data;
        }

        if (isLargeLike(harvestType)) {
            data.setProgress(LARGE_PROGRESS_START);
            data.setTension(LARGE_TENSION_START);
            data.setReeling(false);

            data.setLastStateUpdateEpochMs(startAtEpochMs);

            data.setPumpProgress(randDoubleRange(rng, LARGE_PUMP_PROGRESS_MIN, LARGE_PUMP_PROGRESS_MAX));
            data.setPumpTension(randDoubleRange(rng, LARGE_PUMP_TENSION_MIN, LARGE_PUMP_TENSION_MAX));
            data.setTensionCooldownPerMs(LARGE_TENSION_COOLDOWN_PER_MS);
            data.setLastPumpEpochMs(0);

            // LARGE는 핑퐁 게이지 미사용
            data.setGaugeCycleMs(0);
            data.setFirstWindowCenterPct(0);
            data.setFirstWindowWidthPct(0);
            data.setSecondWindowCenterPct(0);
            data.setSecondWindowWidthPct(0);

            data.setStage(1);
            return data;
        }

        // 알 수 없는 타입
        data.setGaugeCycleMs(0);
        data.setStage(1);
        return data;
    }

    private static double randDoubleRange(SplittableRandom rng, double min, double max) {
        if (max <= min) return min;
        return min + (rng.nextDouble() * (max - min));
    }
}
