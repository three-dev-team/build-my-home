package com.buildmyhome.game.dto;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ShopItemType {
    FISHING_CHANCE(300),    // 낚시 떡밥
    TARANTULA(200),         // 타란튤라
    WATERING(50),           // 물뿌리개
    KK_TICKET(50);         // KK관람티켓

    private final int price;
}
