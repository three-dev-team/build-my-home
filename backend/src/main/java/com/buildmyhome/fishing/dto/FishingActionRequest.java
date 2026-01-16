package com.buildmyhome.fishing.dto;

import lombok.Data;

// 클라 → 서버로 “낚시 중에 버튼 눌렀어(액션 발생)” 를 보내는 요청 DTO
@Data
public class FishingActionRequest {
    private Long roomId;
    private String action; // "HIT" | "REEL_START" | "REEL_STOP"
}
