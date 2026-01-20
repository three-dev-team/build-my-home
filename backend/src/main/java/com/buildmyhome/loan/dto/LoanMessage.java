package com.buildmyhome.loan.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LoanMessage {
    private Long roomId;
    private Long memberId;
    private int amount;     // 대출/상환 금액

    @JsonProperty("isBankTile")
    private boolean isBankTile; // 은행 칸 여부 (수수료 계산용)
}
