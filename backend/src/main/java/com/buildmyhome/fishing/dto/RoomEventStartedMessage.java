package com.buildmyhome.fishing.dto;

import lombok.*;

import java.util.Map;

// 룸 이벤트(미니게임) 시작 시 전달되는 메시지
// 프론트는 seed + params를 이용해서 60fps 로컬 애니메이션(게이지/타이밍)을 재생
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoomEventStartedMessage {

    private String type;      // "ROOM_EVENT_STARTED"
    private String eventType; // "FISHING"
    private Long roomId;
    private Long actorMemberId;
    private String harvestType; // "FISH_SMALL" | "FISH_MEDIUM" | "FISH_LARGE"

    // 서버 기준 시간(절대시각)과 세션 재현용 seed
    private long eventStartTimeMs;
    private long durationMs;
    private long seed;

    // 프론트가 화면을 그릴 때 필요한 파라미터(낚시 규칙/타이밍 등)
    private Map<String, Object> params;
}
