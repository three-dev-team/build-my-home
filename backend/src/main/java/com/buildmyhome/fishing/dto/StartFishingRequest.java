package com.buildmyhome.fishing.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// 클라 -> 서버 시작 요청 DTO
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class StartFishingRequest {

  private Long roomId;
  private String harvestType;
  private Boolean useBait; // 떡밥 사용 여부
}
