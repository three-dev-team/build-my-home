package com.buildmyhome.fishing.dto;

import lombok.*;

// TODO(공통화-RoomEvent 메시지DTO):
// [현재 역할]
// - 도메인(낚시)에서 WS로 전달하는 이벤트 메시지 포맷을 정의한다.
// - type/eventType/roomId/actorMemberId/params 구조로 시작/진행/"결과"/에러를 전달한다.
//
// [왜 공통으로 빼야 하나]
// - 상점/대출/미니게임/선택지 등 대부분의 칸 이벤트가 동일한 4종 메시지(STARTED/UPDATE/RESULT/ERROR)를 쓴다.
// - DTO가 도메인별로 흩어지면 프론트에서 eventType마다 처리 코드를 복붙하게 되어 유지보수 비용이 급증한다.
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoomEventResultMessage {

    private String type; // "ROOM_EVENT_RESULT"
    private String eventType; // "FISHING"

    private Long roomId;
    private Long actorMemberId; // 이번 이벤트에서 action을 수행한 멤버 id(대부분 보상 적용 대상)

    private boolean success; // 성공 여부
    private String harvestType; // 수확물 타입
    private int gainedQty; // 획득 개수
    private String message; // 화면에 내보낼 성공/실패 문구
}
