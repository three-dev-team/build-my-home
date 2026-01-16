package com.buildmyhome.fishing.dto;

import lombok.Data;

// 클라 → 서버로 “낚시 이벤트 시작해줘” 라고 요청할 때 쓰는 요청 DTO
@Data
public class StartFishingRequest {
    private Long roomId;
    private String harvestType; // 어떤 낚시 난이도/어종 규칙으로 시작할지 ("FISH_SMALL" | "FISH_MEDIUM" | "FISH_LARGE")
}
