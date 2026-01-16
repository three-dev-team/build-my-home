package com.buildmyhome.game.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class GameMessage {
    private String type;
    private Long roomId;
    private Long memberId;
    private String status;

    private List<GamePlayerState> players;
    
    // 상태 동기화를 위한 추가 필드
    private Long currentPlayerId;
    private List<Long> turnOrder;
    private int currentRound;
    private int totalRounds;
}