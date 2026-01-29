package com.buildmyhome.fishing.model;

import com.buildmyhome.game.dto.HarvestType;
import lombok.Getter;
import lombok.Setter;

// 낚시 판정을 하기 위해 서버가 기억해야 하는 낚시 전용 데이터
// 진행 중인 이벤트의 임시 상태 저장
@Getter
@Setter
public class FishingSession {

  private HarvestType harvestType; // FISH_SMALL | FISH_MEDIUM | FISH_LARGE

  // 이벤트 시작 시각(epoch ms)
  // SMALL/MEDIUM 게이지 계산 기준 시각
  // LARGE 쿨다운 계산 기준 시각
  private long startAtEpochMs;

  // SMALL / MEDIUM 게이지 파라미터
  private long gaugeCycleMs; // 게이지 왕복 주기(ms), 0이면 게이지 판정 미사용 상태

  private double firstWindowCenterPct; // 1단계 성공 구간 중심(%)
  private double firstWindowWidthPct; // 1단계 성공 구간 폭(%)

  private double secondWindowCenterPct; // 2단계 성공 구간 중심(%)
  private double secondWindowWidthPct; // 2단계 성공 구간 폭(%)

  private int stage = 1; // MEDIUM 단계, 1이면 1단계 진행, 2이면 2단계 진행

  private long lastHitActionEpochMs; // 마지막 HIT 입력 시각(epoch ms), 연타 방지 기준 시각

  // LARGE 진행 상태
  private double progress; // 진행도(0~100)
  private double tension; // 장력(0~100)

  private boolean reeling; // 릴 감는 중 여부, START~STOP 사이 상태

  private long lastStateUpdateEpochMs; // 마지막 상태 업데이트 시각(epoch ms), 쿨다운 계산 기준 시각

  private double pumpProgress; // 펌프 1회(STOP 처리) 시 progress 증가량
  private double pumpTension; // 펌프 1회(STOP 처리) 시 tension 증가량

  private double tensionCooldownPerMs; // 정지 시간 1ms당 tension 감소량

  private long lastPumpEpochMs; // 마지막 펌프(STOP) 시각(epoch ms), 펌프 간격 패널티 계산 기준 시각
}
