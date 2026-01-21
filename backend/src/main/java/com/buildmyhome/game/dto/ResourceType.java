package com.buildmyhome.game.dto;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ResourceType {
    WOOD(120, 60),      // 목재
    IRON(80, 40),      // 철광석
    CLOTH(60, 30),     // 천
    BRICK(140, 70),     // 벽돌
    WALLPAPER(200,100), // 벽지
    CLAY(100,50),       // 점토
    FLOORING(160,80);       // 바닥

    private final int buyPrice;
    private final int sellPrice;
}
