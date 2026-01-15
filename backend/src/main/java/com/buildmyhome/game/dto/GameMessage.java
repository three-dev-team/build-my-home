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
}
