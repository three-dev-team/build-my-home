package com.buildmyhome.fishing.policy;

import com.buildmyhome.fishing.model.FishingSession;

import java.util.SplittableRandom; // 일반 Random보다 분할(병렬)용으로 설계된 RNG고, 성능/품질이 좋다고 알려져 있음

// 낚시 한 판을 시작할 때, 서버 판정에 필요한 랜덤 파라미터(룰)를 만들어서 FishingSession에 채워주는 룰 생성기
public class FishingPolicy {

    // 소물고기
    private static final long SMALL_SUCCESS_DURATION_MS = 550; // 성공 판정 구간 길이
    private static final long SMALL_BITE_DELAY_MIN_MS = 1500; // 이벤트 시작 후 몇 ms 뒤에 입질(=성공 판정 구간 시작)이 올 수 있는지 (최솟값)
    private static final long SMALL_BITE_DELAY_MAX_MS = 4200; // 이벤트 시작 후 몇 ms 뒤에 입질(=성공 판정 구간 시작)이 올 수 있는지 (최댓값)

    // 중물고기 (SMALL과 동일한 판정 방식, 2번 진행)
    private static final long MEDIUM_SUCCESS_DURATION_MS = 450;
    private static final long MEDIUM_FIRST_BITE_DELAY_MIN_MS = 1400;
    private static final long MEDIUM_FIRST_BITE_DELAY_MAX_MS = 3200;
    private static final long MEDIUM_SECOND_BITE_DELAY_MIN_MS = 1500;
    private static final long MEDIUM_SECOND_BITE_DELAY_MAX_MS = 2500;

    // 대물고기
    private static final double LARGE_PROGRESS_PER_MS = 0.020; // 1초에 20 올라감
    private static final double LARGE_TENSION_UP_PER_MS = 0.030; // 감는 중 장력 상승
    private static final double LARGE_TENSION_DOWN_PER_MS = 0.045; // 멈추면 장력 하강

    // 실수로 new FishingPolicy() 못하게 막음
    private FishingPolicy() {}

    public static FishingSession createSessionData(String harvestType, long eventDurationMs, long seed, long eventStartTimeMs) {
        // eventDurationMs : 이번 이벤트 전체 제한 시간
        // seed : 같은 seed면 같은 bite 타이밍이 나오게 해서(재현성) 디버깅/리플레이에 유리
        // eventStartTimeMs : System.currentTimeMillis() 기준 시간, LARGE의 dt 계산 기준점

        // "무는 타이밍"만 랜덤(=판마다 패턴이 달라짐) + 나머지 파라미터는 난이도별로 고정(=체감 난이도 일정)
        // 여기서부터 뽑는 랜덤 값들은 항상 seed에 의해 결정 -> 같은 seed면 firstBiteDelay/gap이 동일하게 나옴
        SplittableRandom r = new SplittableRandom(seed);

        // 결과로 돌려줄 데이터 묶음 생성
        FishingSession data = new FishingSession();
        data.setHarvestType(harvestType);
        data.setStage(1); // SMALL: 1단계만 진행, MEDIUM: 1,2단계 진행, LARGE: 필요X
        data.setLastHitActionAtMs(0); // 마지막 Hit(클릭) 시간

        if ("FISH_SMALL".equals(harvestType)) {
            // bite(입질 시작 지연)만 랜덤, 성공 판정 구간 길이(successDuration)는 고정
            long firstBiteDelayMs = pickBiteDelayMs(
                    r,
                    eventDurationMs,
                    SMALL_SUCCESS_DURATION_MS,
                    SMALL_BITE_DELAY_MIN_MS,
                    SMALL_BITE_DELAY_MAX_MS
            );

            data.setFirstBiteDelayMs(firstBiteDelayMs); // 첫 입질이 언제 오는지 저장
            data.setFirstSuccessDurationMs(SMALL_SUCCESS_DURATION_MS); // 성공 판정 구간 길이를 저장
            return data;
        }

        if ("FISH_MEDIUM".equals(harvestType)) {
            // 1차 bite 지연 랜덤 + 2차는 "1차 + 간격(gap)"으로 랜덤
            long firstBiteDelayMs = pickBiteDelayMs(
                    r,
                    eventDurationMs,
                    MEDIUM_SUCCESS_DURATION_MS,
                    MEDIUM_FIRST_BITE_DELAY_MIN_MS,
                    MEDIUM_FIRST_BITE_DELAY_MAX_MS
            );

            long gapMs = nextLong(r, MEDIUM_SECOND_BITE_DELAY_MIN_MS, MEDIUM_SECOND_BITE_DELAY_MAX_MS + 1);
            long secondBiteDelayMs = firstBiteDelayMs + gapMs;

            // 2차도 이벤트 제한 시간 범위 밖으로 튀지 않게 clamp
            long latestSecondBiteDelayMs = latestBiteDelayMs(eventDurationMs, MEDIUM_SUCCESS_DURATION_MS);
            if (secondBiteDelayMs > latestSecondBiteDelayMs) secondBiteDelayMs = latestSecondBiteDelayMs;

            data.setFirstBiteDelayMs(firstBiteDelayMs);
            data.setFirstSuccessDurationMs(MEDIUM_SUCCESS_DURATION_MS);

            data.setSecondBiteDelayMs(secondBiteDelayMs);
            data.setSecondSuccessDurationMs(MEDIUM_SUCCESS_DURATION_MS);
            return data;
        }

        // FISH_LARGE
        // LARGE는 완전 고정(패턴 외우는 문제가 생기면 그때 변주 추가)
        data.setProgress(0);
        data.setTension(0);
        data.setReeling(false);
        data.setLastStateUpdateAtMs(eventStartTimeMs);

        data.setProgressPerMs(LARGE_PROGRESS_PER_MS);
        data.setTensionUpPerMs(LARGE_TENSION_UP_PER_MS);
        data.setTensionDownPerMs(LARGE_TENSION_DOWN_PER_MS);

        return data;
    }

    // 이벤트 시작 후 몇 ms에 입질이 시작되는지 랜덤으로 고름
    // 하지만 (biteDelay + successDuration) 가 eventDuration을 넘어가지 않도록 안전하게 보정
    private static long pickBiteDelayMs(
            SplittableRandom r,
            long eventDurationMs,
            long successDurationMs,
            long biteDelayMinMs,
            long biteDelayMaxMs
    ) {
        long latestAllowedDelayMs = latestBiteDelayMs(eventDurationMs, successDurationMs);

        // eventDuration이 너무 짧은 경우에도 깨지지 않게 방어
        long minDelayMs = Math.max(0, biteDelayMinMs);
        long maxDelayMs = Math.max(minDelayMs, Math.min(biteDelayMaxMs, latestAllowedDelayMs));

        // nextLong은 boundExclusive라서 +1
        return nextLong(r, minDelayMs, maxDelayMs + 1);
    }

    private static long latestBiteDelayMs(long eventDurationMs, long successDurationMs) {
        // 성공 판정 구간 길이(successDuration)가 끝까지 들어가야 하므로 (eventDuration - successDuration)까지만 bite 시작 가능
        // 50ms 여유는 타이밍 경계/네트워크 지연/프레임 차이를 고려한 안전 마진
        return Math.max(0, eventDurationMs - successDurationMs - 50);
    }

    private static long nextLong(SplittableRandom r, long originInclusive, long boundExclusive) {
        return r.nextLong(originInclusive, boundExclusive);
    }
}
