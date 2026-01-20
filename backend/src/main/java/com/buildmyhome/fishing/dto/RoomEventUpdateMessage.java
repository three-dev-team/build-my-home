package com.buildmyhome.fishing.dto;

import lombok.*;

// 룸 이벤트(미니게임) 진행 중 업데이트를 전달하는 메시지
// MEDIUM: stage 전환(1 -> 2)</li>
// LARGE : progress/tension/reeling 업데이트
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoomEventUpdateMessage {

    private String type; // "ROOM_EVENT_UPDATE"
    private String eventType; // "FISHING"
    private Long roomId;
    private Long actorMemberId;
    private Integer stage; // MEDIUM 전용(필요할 때만 채움)

    // LARGE 전용(필요할 때만 채움)
    private Double progress; // 0~100
    private Double tension; // 0~100
    private Boolean reeling; // 릴 감는 중인지

    private Long serverTimeMs; // 서버 기준 시각(epoch ms) - 디버깅/동기화에 도움
}
