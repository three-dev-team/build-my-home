package com.buildmyhome.fishing.dto;

import lombok.*;

// TODO(공통화-RoomEvent 메시지DTO):
// [현재 역할]
// - 도메인(낚시)에서 WS로 전달하는 이벤트 메시지 포맷을 정의한다.
// - type/eventType/roomId/actorMemberId/params 구조로 시작/"진행"/결과/에러를 전달한다.
//
// [왜 공통으로 빼야 하나]
// - 상점/대출/미니게임/선택지 등 대부분의 칸 이벤트가 동일한 4종 메시지(STARTED/UPDATE/RESULT/ERROR)를 쓴다.
// - DTO가 도메인별로 흩어지면 프론트에서 eventType마다 처리 코드를 복붙하게 되어 유지보수 비용이 급증한다.

// 낚시가 진행되는 동안, 서버가 중간 상태를 계속 알려줘야 하는 상황이라 필요
// 중물고기는 게임 2번 진행 -> 서버가 단계(stage) 전환을 알려줘야 함
// 대물고기는 “릴을 감는 동안” 계속 변하는 값을 보여줘야 함
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
}
