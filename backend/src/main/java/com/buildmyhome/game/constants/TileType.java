package com.buildmyhome.game.constants;

import com.buildmyhome.game.dto.GameStatus;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

// 타입 → nextStatus 매핑 → 로직용

@Getter
@RequiredArgsConstructor
public enum TileType {
    START(GameStatus.WAITING_PLAYER_ACTION),
    RESOURCE(GameStatus.WAITING_RESOURCES),
    HARVEST(GameStatus.WAITING_HARVEST),
    SHOP_RESOURCE(GameStatus.WAITING_SHOP_RESOURCE),
    SHOP_ITEM(GameStatus.WAITING_SHOP_ITEM),
    STAMP_GAPDOL(GameStatus.WAITING_STAMP),
    STAMP_MUSEUM(GameStatus.WAITING_STAMP),
    STAMP_AIRPORT(GameStatus.WAITING_STAMP),
    LOAN(GameStatus.WAITING_LOAN),
    FISHING(GameStatus.WAITING_FISHING),
    KK(GameStatus.WAITING_KK),
    MUPANI(GameStatus.WAITING_MUPANI);

    private final GameStatus nextStatus;
}
