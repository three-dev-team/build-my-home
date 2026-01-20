package com.buildmyhome.house.constants;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

// TODO: 반드시 프론트 데이터(houseLevel.js)와 일치해야 함

@Getter
@RequiredArgsConstructor
public enum HouseLevel {
    NONE(0, "없음", 0, 0, 0, 0, 0, 0, 0, 0),
    LAND(1, "땅", 300, 0, 0, 0, 0, 0, 0, 0),
    TENT(2, "텐트", 400, 1, 1, 0, 0, 0, 0, 0),
    HOUSE_1(3, "집(1)", 1000, 0, 1, 1, 0, 0, 0, 0),
    HOUSE_2(4, "집(2)", 1800, 0, 3, 3, 3, 3, 0, 0),
    HOUSE_3(5, "집(3)", 3000, 0, 5, 5, 0, 5, 5, 5);

    private final int level;
    private final String name;
    private final int bell;
    private final int cloth;      // 천
    private final int iron;       // 철
    private final int clay;       // 점토
    private final int wood;       // 나무
    private final int brick;      // 벽돌
    private final int wallpaper;  // 벽지
    private final int flooring;   // 바닥
}