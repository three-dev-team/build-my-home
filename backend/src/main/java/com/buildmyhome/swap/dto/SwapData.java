package com.buildmyhome.swap.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SwapData {
    // 선택된 값들
    private Long player1Id;
    private Long player2Id;
    private String category;    // HOUSE, BELL, RESOURCE, LOAN
    private String direction;   // TO_RIGHT, TO_LEFT, EXCHANGE

    // 룰렛 시작 시간 (서버 시간 동기화용)
    private Long player1StartAt;
    private Long player2StartAt;
    private Long arrowStartAt;

    // 룰렛 속도
    private Long player1CycleMs;
    private Long player2CycleMs;
    private Long arrowCycleMs;

    // 결과 데이터 (프론트에서 문장 조립용)
    private Integer resultAmount;  // 벨/대출 이동 금액
    private Integer resultCount;   // 재화 이동 개수
    private Integer resultLoanAdded;   // 대출 추가된 금액 (벨 부족 시)

    // 3개 다 선택됐는지 확인
    public boolean isAllSelected() {
        return player1Id != null && player2Id != null && category != null && direction != null;
    }
}
