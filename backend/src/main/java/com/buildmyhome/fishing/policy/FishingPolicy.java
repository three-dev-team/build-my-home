package com.buildmyhome.fishing.policy;

import com.buildmyhome.fishing.model.FishingSession;
import com.buildmyhome.game.dto.HarvestType;

import java.util.SplittableRandom; // seed 기반으로 재현 가능한 랜덤 파라미터 생성을 위한 RNG

// 낚시 이벤트 시작 시 서버 판정에 필요한 랜덤 파라미터를 생성해 FishingSession에 채우는 정책 클래스
public class FishingPolicy {

    // SMALL / MEDIUM 게이지 정책 값
    private static final long SMALL_GAUGE_CYCLE_MS = 1800; // SMALL 게이지 1회 왕복 주기(ms)
    private static final double SMALL_WINDOW_WIDTH_PCT = 30.0; // SMALL 성공 구간 폭(%), 값이 클수록 성공 판정 구간이 넓음

    private static final long MEDIUM_GAUGE_CYCLE_MS = 1600; // MEDIUM 게이지 1회 왕복 주기(ms)
    private static final double MEDIUM_STAGE1_WINDOW_WIDTH_PCT = 25.0; // MEDIUM 1단계 성공 구간 폭(%)
    private static final double MEDIUM_STAGE2_WINDOW_WIDTH_PCT = 20.0; // MEDIUM 2단계 성공 구간 폭(%), 1단계보다 좁게 설정

    private static final double WINDOW_CENTER_MIN_PCT = 18.0; // 성공 구간 중심 최소값(%), 너무 끝으로 치우치지 않게 제한
    private static final double WINDOW_CENTER_MAX_PCT = 82.0; // 성공 구간 중심 최대값(%), 너무 끝으로 치우치지 않게 제한

    // LARGE 초기 상태 값
    private static final double LARGE_PROGRESS_START = 0.0; // LARGE 시작 진행도(0~100)
    private static final double LARGE_TENSION_START = 0.0; // LARGE 시작 장력(0~100)

    // LARGE 펌프 1회당 증가량 범위
    private static final double LARGE_PUMP_PROGRESS_MIN = 13.5; // 펌프 1회당 진행도 증가 최소값
    private static final double LARGE_PUMP_PROGRESS_MAX = 14.5; // 펌프 1회당 진행도 증가 최대값

    private static final double LARGE_PUMP_TENSION_MIN = 19.0; // 펌프 1회당 장력 증가 최소값
    private static final double LARGE_PUMP_TENSION_MAX = 20.0; // 펌프 1회당 장력 증가 최대값

    private static final double LARGE_TENSION_COOLDOWN_PER_MS = 0.025; // 정지 시간 1ms당 장력 감소량, 예시로 1초에 25 감소

    // 낚시 타입에 맞는 세션 데이터를 생성하는 메소드
    // seed를 기반으로 동일한 seed면 동일한 룰이 생성되도록 보장
    public static FishingSession createSessionData(HarvestType harvestType, long seed, long startAtEpochMs) {
        FishingSession data = new FishingSession();
        data.setHarvestType(harvestType);

        // seed 기반 RNG 생성
        SplittableRandom rng = new SplittableRandom(seed);

        // 공통 필드 초기화 메소드
        data.setStartAtEpochMs(startAtEpochMs); // 이벤트 시작 기준 시각
        data.setStage(1); // 단계 초기값
        data.setLastHitActionEpochMs(0); // 마지막 HIT 시각 초기화

        // 핑퐁 게이지 파라미터 초기화 메소드
        data.setGaugeCycleMs(0);
        data.setFirstWindowCenterPct(0);
        data.setFirstWindowWidthPct(0);
        data.setSecondWindowCenterPct(0);
        data.setSecondWindowWidthPct(0);

        // LARGE 펌프 파라미터 초기화 메소드
        data.setProgress(0);
        data.setTension(0);
        data.setReeling(false);
        data.setLastStateUpdateEpochMs(startAtEpochMs); // 쿨다운 계산 기준 시각 초기값

        data.setPumpProgress(0);
        data.setPumpTension(0);
        data.setTensionCooldownPerMs(0);
        data.setLastPumpEpochMs(0);

        if (harvestType == null) {
            return data;
        }

        switch (harvestType) {
            case FISH_SMALL -> {
                data.setGaugeCycleMs(SMALL_GAUGE_CYCLE_MS); // SMALL 게이지 주기 설정

                // SMALL 성공 구간 설정 메소드
                double c = randDoubleRange(rng, WINDOW_CENTER_MIN_PCT, WINDOW_CENTER_MAX_PCT); // 성공 구간 중심 랜덤 생성
                data.setFirstWindowCenterPct(c);
                data.setFirstWindowWidthPct(SMALL_WINDOW_WIDTH_PCT);

                data.setSecondWindowCenterPct(0); // SMALL은 2단계 미사용
                data.setSecondWindowWidthPct(0);

                data.setStage(1); // SMALL은 단일 단계 사용
            }

            case FISH_MEDIUM -> {
                data.setGaugeCycleMs(MEDIUM_GAUGE_CYCLE_MS); // MEDIUM 게이지 주기 설정

                // MEDIUM 1단계 성공 구간 설정 메소드
                double c1 = randDoubleRange(rng, WINDOW_CENTER_MIN_PCT, WINDOW_CENTER_MAX_PCT); // 1단계 중심 랜덤 생성
                data.setFirstWindowCenterPct(c1);
                data.setFirstWindowWidthPct(MEDIUM_STAGE1_WINDOW_WIDTH_PCT);

                // MEDIUM 2단계 성공 구간 설정 메소드
                double c2 = randDoubleRange(rng, WINDOW_CENTER_MIN_PCT, WINDOW_CENTER_MAX_PCT); // 2단계 중심 랜덤 생성
                data.setSecondWindowCenterPct(c2);
                data.setSecondWindowWidthPct(MEDIUM_STAGE2_WINDOW_WIDTH_PCT);

                data.setStage(1); // 시작 단계 설정
            }

            case FISH_LARGE -> {
                data.setProgress(LARGE_PROGRESS_START); // 진행도 초기값 설정
                data.setTension(LARGE_TENSION_START); // 장력 초기값 설정
                data.setReeling(false); // 시작 시 감는 중 아님

                data.setLastStateUpdateEpochMs(startAtEpochMs); // 상태 업데이트 기준 시각 설정

                // LARGE 펌프 파라미터 설정 메소드
                data.setPumpProgress(randDoubleRange(rng, LARGE_PUMP_PROGRESS_MIN, LARGE_PUMP_PROGRESS_MAX)); // 펌프 진행도 증가량 랜덤 설정
                data.setPumpTension(randDoubleRange(rng, LARGE_PUMP_TENSION_MIN, LARGE_PUMP_TENSION_MAX)); // 펌프 장력 증가량 랜덤 설정
                data.setTensionCooldownPerMs(LARGE_TENSION_COOLDOWN_PER_MS); // 쿨다운 속도 설정
                data.setLastPumpEpochMs(0); // 마지막 펌프 시각 초기화

                // LARGE는 핑퐁 게이지 미사용
                data.setGaugeCycleMs(0);
                data.setFirstWindowCenterPct(0);
                data.setFirstWindowWidthPct(0);
                data.setSecondWindowCenterPct(0);
                data.setSecondWindowWidthPct(0);

                data.setStage(1); // 단계 기본값 유지
            }

            default -> {
                data.setGaugeCycleMs(0); // 알 수 없는 타입이면 게이지 판정 불가 상태
                data.setStage(1);
            }
        }

        return data;
    }

    // double 난수 범위 생성 메소드
    private static double randDoubleRange(SplittableRandom rng, double min, double max) {
        if (max <= min) return min;
        return min + (rng.nextDouble() * (max - min));
    }
}
