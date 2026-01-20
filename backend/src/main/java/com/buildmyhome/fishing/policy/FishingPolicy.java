package com.buildmyhome.fishing.policy;

import com.buildmyhome.game.dto.HarvestType;
import com.buildmyhome.fishing.model.FishingSession;

import java.util.SplittableRandom; // 일반 Random보다 분할(병렬)용으로 설계된 RNG고, 성능/품질이 좋다고 알려져 있음

// 낚시 한 판을 시작할 때, 서버 판정에 필요한 랜덤 파라미터(룰)를 만들어서 FishingSession에 채워주는 룰 생성기
public class FishingPolicy {

    // SMALL FISH
    private static final long SMALL_SUCCESS_DURATION_MS = 550; // 성공 판정 구간 길이
    private static final long SMALL_BITE_DELAY_MIN_MS = 1500; // 이벤트 시작 후 몇 ms 뒤에 입질(=성공 판정 구간 시작)이 올 수 있는지 (최솟값)
    private static final long SMALL_BITE_DELAY_MAX_MS = 4200; // 이벤트 시작 후 몇 ms 뒤에 입질(=성공 판정 구간 시작)이 올 수 있는지 (최댓값)

    // MEDIUM FISH (SMALL과 동일한 판정 방식, 2번 진행)
    private static final long MEDIUM_SUCCESS_DURATION_MS = 450;
    private static final long MEDIUM_FIRST_BITE_DELAY_MIN_MS = 1200;
    private static final long MEDIUM_FIRST_BITE_DELAY_MAX_MS = 2800;
    private static final long MEDIUM_SECOND_BITE_GAP_MIN_MS = 600;  // 1차 입질 시작 후, 2차 입질 시작까지 최소 간격
    private static final long MEDIUM_SECOND_BITE_GAP_MAX_MS = 1400; // 1차 입질 시작 후, 2차 입질 시작까지 최대 간격

    // LARGE FISH (릴링)
    private static final double LARGE_PROGRESS_START = 0.0;
    private static final double LARGE_TENSION_START = 0.0;

    // 진행/장력은 seed 기반으로 약간의 변주를 주되, 극단적으로 튀지 않게 범위를 좁게 둔다.
    private static final double LARGE_PROGRESS_PER_MS_MIN = 0.015;
    private static final double LARGE_PROGRESS_PER_MS_MAX = 0.020;

    private static final double LARGE_TENSION_UP_PER_MS_MIN = 0.020;
    private static final double LARGE_TENSION_UP_PER_MS_MAX = 0.028;

    private static final double LARGE_TENSION_DOWN_PER_MS_MIN = 0.030;
    private static final double LARGE_TENSION_DOWN_PER_MS_MAX = 0.040;

    public static FishingSession createSessionData(HarvestType harvestType, long durationMs, long seed, long startAtEpochMs) {
        FishingSession data = new FishingSession();
        data.setHarvestType(harvestType);

        // seed 기반 RNG (같은 seed면 같은 룰 생성)
        SplittableRandom rng = new SplittableRandom(seed);

        // 공통 초기화(안전)
        data.setStage(1);
        data.setLastHitActionEpochMs(0);

        data.setFirstBiteDelayMs(0);
        data.setFirstSuccessDurationMs(0);
        data.setSecondBiteDelayMs(0);
        data.setSecondSuccessDurationMs(0);

        data.setProgress(0);
        data.setTension(0);
        data.setReeling(false);
        data.setLastStateUpdateEpochMs(startAtEpochMs);

        data.setProgressPerMs(0);
        data.setTensionUpPerMs(0);
        data.setTensionDownPerMs(0);

        switch (harvestType) {
            case FISH_SMALL -> {
                long biteDelay = randRange(rng, SMALL_BITE_DELAY_MIN_MS, SMALL_BITE_DELAY_MAX_MS);

                data.setFirstBiteDelayMs(biteDelay);
                data.setFirstSuccessDurationMs(SMALL_SUCCESS_DURATION_MS);

                // MEDIUM 2단계 없음
                data.setSecondBiteDelayMs(0);
                data.setSecondSuccessDurationMs(0);

                // LARGE 관련은 0 유지
                data.setProgress(0);
                data.setTension(0);
                data.setReeling(false);
                data.setLastStateUpdateEpochMs(startAtEpochMs);
                data.setProgressPerMs(0);
                data.setTensionUpPerMs(0);
                data.setTensionDownPerMs(0);
            }

            case FISH_MEDIUM -> {
                // 1차 bite 지연 랜덤 + 2차는 "1차 + 간격(gap)"으로 랜덤
                long firstBiteDelay = randRange(rng, MEDIUM_FIRST_BITE_DELAY_MIN_MS, MEDIUM_FIRST_BITE_DELAY_MAX_MS);
                long gap = randRange(rng, MEDIUM_SECOND_BITE_GAP_MIN_MS, MEDIUM_SECOND_BITE_GAP_MAX_MS);
                long secondBiteDelay = firstBiteDelay + gap;

                data.setStage(1);

                data.setFirstBiteDelayMs(firstBiteDelay);
                data.setFirstSuccessDurationMs(MEDIUM_SUCCESS_DURATION_MS);

                data.setSecondBiteDelayMs(secondBiteDelay);
                data.setSecondSuccessDurationMs(MEDIUM_SUCCESS_DURATION_MS);

                data.setLastHitActionEpochMs(0);

                // LARGE 관련은 0 유지
                data.setProgress(0);
                data.setTension(0);
                data.setReeling(false);
                data.setLastStateUpdateEpochMs(startAtEpochMs);
                data.setProgressPerMs(0);
                data.setTensionUpPerMs(0);
                data.setTensionDownPerMs(0);
            }

            case FISH_LARGE -> {
                data.setProgress(LARGE_PROGRESS_START);
                data.setTension(LARGE_TENSION_START);
                data.setReeling(false);

                data.setLastStateUpdateEpochMs(startAtEpochMs);

                data.setProgressPerMs(randDoubleRange(rng, LARGE_PROGRESS_PER_MS_MIN, LARGE_PROGRESS_PER_MS_MAX));
                data.setTensionUpPerMs(randDoubleRange(rng, LARGE_TENSION_UP_PER_MS_MIN, LARGE_TENSION_UP_PER_MS_MAX));
                data.setTensionDownPerMs(randDoubleRange(rng, LARGE_TENSION_DOWN_PER_MS_MIN, LARGE_TENSION_DOWN_PER_MS_MAX));

                // SMALL/MEDIUM 관련은 0 유지
                data.setStage(1);
                data.setFirstBiteDelayMs(0);
                data.setFirstSuccessDurationMs(0);
                data.setSecondBiteDelayMs(0);
                data.setSecondSuccessDurationMs(0);
                data.setLastHitActionEpochMs(0);
            }

            default -> {
                // 알 수 없는 타입이면 안전하게 SMALL처럼 실패하기 쉬운 세팅으로 둔다
                long biteDelay = randRange(rng, SMALL_BITE_DELAY_MIN_MS, SMALL_BITE_DELAY_MAX_MS);

                data.setFirstBiteDelayMs(biteDelay);
                data.setFirstSuccessDurationMs(SMALL_SUCCESS_DURATION_MS);

                data.setSecondBiteDelayMs(0);
                data.setSecondSuccessDurationMs(0);

                data.setLastHitActionEpochMs(0);

                data.setProgress(0);
                data.setTension(0);
                data.setReeling(false);
                data.setLastStateUpdateEpochMs(startAtEpochMs);

                data.setProgressPerMs(0);
                data.setTensionUpPerMs(0);
                data.setTensionDownPerMs(0);
            }
        }

        return data;
    }

    private static long randRange(SplittableRandom rng, long min, long max) {
        // inclusive min, inclusive max
        if (max <= min) return min;
        return min + rng.nextLong(max - min + 1);
    }

    private static double randDoubleRange(SplittableRandom rng, double min, double max) {
        if (max <= min) return min;
        return min + (rng.nextDouble() * (max - min));
    }
}
