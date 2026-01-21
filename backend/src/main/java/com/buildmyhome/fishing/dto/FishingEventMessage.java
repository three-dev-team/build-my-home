package com.buildmyhome.fishing.dto;

import lombok.*;

import java.util.Map;

// 서버 -> 클라 이벤트 메시지 DTO
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FishingEventMessage {

    private String type; // ROOM_EVENT_STARTED/UPDATE/RESULT 또는 ERROR
    private String eventType; // FISHING
    private Long roomId;
    private Long actorMemberId;
    private String harvestType;
    private Long eventStartTimeMs; // 시작 기준 시각(epoch ms)
    private Long durationMs; // 게임 제한 시간(ms)
    private Long seed; // 룰/랜덤 재현용 seed

    private Map<String, Object> params; // 프론트 렌더링에 필요한 파라미터 묶음

    private Integer stage; // MEDIUM 전용 현재 단계 (1 또는 2))
    private Double progress; // LARGE 전용 진행도(0~100)
    private Double tension; // LARGE 전용 장력(0~100)
    private Boolean reeling; // LARGE 전용 릴링 상태(true: 감는 중, false: 멈춤)

    private Long serverTimeMs; // 서버가 찍어준 기준 시각(epoch ms)(동기화/디버그 힌트용)
    private Boolean success; // 결과/에러 성공 여부(결과면 true/false, 에러면 보통 false 처리)
    private Integer gainedQty;  // 성공 시 획득 개수(성공 1, 실패 0)
    private String message; // 결과/에러 안내 문구
}
