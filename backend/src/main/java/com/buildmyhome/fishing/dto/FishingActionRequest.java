package com.buildmyhome.fishing.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

// 클라 → 서버로 “낚시 중에 버튼 눌렀어(액션 발생)” 를 보내는 요청 DTO
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class FishingActionRequest {

    public static final String ACTION_HIT = "HIT";
    public static final String ACTION_REEL_START = "REEL_START";
    public static final String ACTION_REEL_STOP = "REEL_STOP";

    private Long roomId;
    private String action; // "HIT" | "REEL_START" | "REEL_STOP"
}
