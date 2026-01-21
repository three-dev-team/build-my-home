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

    // 시작할 낚시 타입 -> null/빈값이면 서버가 자동 선택
    // 값이 있으면 해당 타입으로 강제 시작 (테스트/디버그용)
    // "FISH_SMALL" | "FISH_MEDIUM" | "FISH_LARGE"
    private String harvestType;
}
