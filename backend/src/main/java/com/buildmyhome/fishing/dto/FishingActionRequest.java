package com.buildmyhome.fishing.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// 클라 -> 서버 액션 요청 DTO
// 낚시 진행 중 버튼 입력(HIT/릴 시작/릴 종료) 전달용
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class FishingActionRequest {

    public static final String ACTION_HIT = "HIT";
    public static final String ACTION_REEL_START = "REEL_START";
    public static final String ACTION_REEL_STOP = "REEL_STOP";

    private Long roomId;
    private String action;
}
