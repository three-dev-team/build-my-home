package com.buildmyhome.fishing.model;

import lombok.Getter;
import lombok.Setter;
import com.buildmyhome.game.dto.HarvestType;

// 낚시 판정을 하기 위해 서버가 기억해야 하는 낚시 전용 데이터
// 진행 중인 이벤트의 임시 상태(짧게 살다 사라짐)
@Getter
@Setter
public class FishingSession {

    // 어떤 수확물 타입인지 (HarvestType enum 문자열과 동일하게 유지)
    private HarvestType harvestType; // FISH_SMALL | FISH_MEDIUM | FISH_LARGE

    // MEDIUM에서 2연속 타격 단계
    // 기본은 1단계부터 시작하는 게 자연스럽다(세션 생성 시 초기값)
    private int stage = 1; // 1: 1단계 진행 중, 2: 2단계 진행 중

    // SMALL, MEDIUM 타이밍 판정
    private long firstBiteDelayMs; // 이벤트 시작 시각(startAt) 기준으로 몇 ms 뒤에 입질/성공 가능 구간이 시작되는지
    private long firstSuccessDurationMs; // 그 입질 구간이 얼마나 지속되는지(성공 가능한 시간 길이)를 ms로 저장

    // MEDIUM은 2번 진행하게 함
    private long secondBiteDelayMs;
    private long secondSuccessDurationMs;

    // MEDIUM 연타 방지 -> 안전구간에서 2번 더블 클릭하면 2번 인정 위험
    // epoch_ms = (현재 UTC 시각) - (1970-01-01 00:00:00 UTC) 를 밀리초로 환산한 값
    // -> 지금을 비교/저장하기 쉬움(절대 시각 필요)
    private long lastHitActionEpochMs; // 마지막으로 클릭한 시간(epoch ms)

    // LARGE 릴링 판정
    private double progress; // 목표까지 얼마나 진행했는지(진행률,0~100)
    private double tension;  // 장력(줄이 끊어질 위험도,0~100)
    private boolean reeling; // 현재 사용자가 릴을 “감는 중인지” 상태

    // 마지막으로 progress/tension을 업데이트한 실제 시각(epoch ms)
    // LARGE는 dt 기반 업데이트이므로, 세션 생성 시점에 eventStartEpochMs로 초기화해두는 것이 안전
    private long lastStateUpdateEpochMs;

    private double progressPerMs; // 1ms당 progress가 얼마나 증가하는지
    private double tensionUpPerMs; // 릴을 감는 중(`reeling=true`)일 때, 1ms당 tension이 얼마나 올라가는지
    private double tensionDownPerMs; // 릴을 멈췄을 때(`reeling=false`) 또는 안전 상태에서, 1ms당 tension이 얼마나 내려가는지
}
