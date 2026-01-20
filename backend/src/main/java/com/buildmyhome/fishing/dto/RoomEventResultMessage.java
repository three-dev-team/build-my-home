package com.buildmyhome.fishing.dto;

//  룸 이벤트(미니게임) 결과 메시지
// 성공/실패와 획득 수량, 서버는 필요 시 GameState에도 반영
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoomEventResultMessage {

    private String type;      // "ROOM_EVENT_RESULT"
    private String eventType; // "FISHING"
    private Long roomId;
    private Long actorMemberId;
    private boolean success;
    private String harvestType;
    private int gainedQty;  // 실제로 획득한 수량(기본 1). 프론트 결과 UI에 그대로 표시
    private String message;
}
