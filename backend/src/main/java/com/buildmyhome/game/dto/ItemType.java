package com.buildmyhome.game.dto;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

// TODO: 프론트 데이터와 동기화 필요
@Getter
@RequiredArgsConstructor
public enum ItemType {
    // 기존 아이템 (가격 미정 또는 비매품은 0)
    PIPE(0),           // 토관
    CUSTOM_DICE(0),   // 내맘대로 주사위
    DOUBLE_DICE(0),    // 더블주사위
    GOLD_DICE(0),     // 금주사위
    MIRROR(0),         // 거울

    // 상점 아이템 (ShopItemType 통합)
    FISHING_CHANCE(300),    // 낚시 떡밥
    TARANTULA(200),         // 타란튤라
    WATERING(50),           // 물뿌리개
    KK_TICKET(50);         // KK관람티켓

    private final int price;
}
