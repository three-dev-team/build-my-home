package com.buildmyhome.game.dto;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum HarvestType {
  // 과일
  APPLE(80),
  ORANGE(100),
  PEAR(120),
  PEACH(150),
  CHERRY(200),

  // 생선
  FISH_SMALL_1(100), // 흰동가리
  FISH_SMALL_2(100), // 송사리
  FISH_MEDIUM_1(200), // 농어
  FISH_MEDIUM_2(200), // 멸치
  FISH_LARGE(500), // 개복치
  FISH_RARE(1000); // 상어

  private final int price;
}
