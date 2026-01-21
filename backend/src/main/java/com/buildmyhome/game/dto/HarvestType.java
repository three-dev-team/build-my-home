package com.buildmyhome.game.dto;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum HarvestType {
    // 과일
    APPLE(80),
    ORANGE(100),
    PEAR(120),
    PEACH(150),
    CHERRY(200),

    // 생선
    FISH_SMALL(50),
    FISH_MEDIUM(150),
    FISH_LARGE(300);

    private final int price;
}
