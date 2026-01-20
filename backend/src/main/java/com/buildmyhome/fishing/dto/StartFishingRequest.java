package com.buildmyhome.fishing.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// 클라 → 서버로 “낚시 이벤트 시작해줘” 라고 요청할 때 쓰는 요청 DTO
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class StartFishingRequest {

    private Long roomId;

    // - null/빈값이면: 서버가 소/중/대(동일 확률) 랜덤 선택
    // - 값이 있으면: 해당 타입으로 강제 시작(디버그/테스트)
    // "FISH_SMALL" | "FISH_MEDIUM" | "FISH_LARGE"
    private String harvestType;
}
