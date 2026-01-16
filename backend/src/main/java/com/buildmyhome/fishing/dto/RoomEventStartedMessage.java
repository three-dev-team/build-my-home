package com.buildmyhome.fishing.dto;

import lombok.*;

import java.util.Map;

// TODO(공통화-RoomEvent 메시지DTO):
// [현재 역할]
// - 도메인(낚시)에서 WS로 전달하는 이벤트 메시지 포맷을 정의한다.
// - type/eventType/roomId/actorMemberId/params 구조로 "시작"/진행/결과/에러를 전달한다.
//
// [왜 공통으로 빼야 하나]
// - 상점/대출/미니게임/선택지 등 대부분의 칸 이벤트가 동일한 4종 메시지(STARTED/UPDATE/RESULT/ERROR)를 쓴다.
// - DTO가 도메인별로 흩어지면 프론트에서 eventType마다 처리 코드를 복붙하게 되어 유지보수 비용이 급증한다.
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoomEventStartedMessage {

    private String type; // "ROOM_EVENT_STARTED"
    private String eventType; // "FISHING"

    private Long roomId;
    private Long actorMemberId;

    private String harvestType;

    private long eventStartTimeMs; // 서버가 ‘시작’으로 확정한 기준 시각(ms)
    private long durationMs; // 이 이벤트가 총 몇 ms 동안 진행되는지
    // 물고기가 무는 타이밍 랜덤 -> 다른 플레이어도 같은 화면을 보려면 필요 (화면 불일치 줄고 메시지 가벼워짐)
    private long seed; // seed는 랜덤값(결과물)을 다시 만들어낼 수 있는 열쇠(압축키)

    // 서버가 낚시 세션을 만들면서 결정한 값들 중, 프론트가 화면을 그리거나 동기화하는 데 필요한 것들
    // 노란바(움직이는 바) 속도/패턴과 같은 값들
    private Map<String, Object> params;
}
