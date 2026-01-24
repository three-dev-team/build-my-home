package com.buildmyhome.game.dto;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ItemType {
    PIPE(60),         // 토관
    CUSTOM_DICE(100), // 내맘대로 주사위
    GOLD_DICE(100),   // 금주사위
    DOUBLE_DICE(80),  // 더블주사위
    MIRROR(70);        // 거울

    private final int price;
}
