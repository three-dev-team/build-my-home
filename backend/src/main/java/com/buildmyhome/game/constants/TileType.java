package com.buildmyhome.game.constants;

import com.buildmyhome.game.dto.GameStatus;

// 타입 → nextStatus 매핑 → 로직용

public enum TileType {
    START(GameStatus.WAITING_PLAYER_ACTION),
    RESOURCE(GameStatus.WAITING_RESOURCES),
    HARVEST(GameStatus.WAITING_HARVEST),
    SHOP_RESOURCE(GameStatus.WAITING_SHOP_RESOURCE),
    SHOP_ITEM(GameStatus.WAITING_SHOP_ITEM),
    STAMP_BLUE(GameStatus.WAITING_STAMP),
    STAMP_YELLOW(GameStatus.WAITING_STAMP),
    STAMP_RED(GameStatus.WAITING_STAMP),
    STAMP_GREEN(GameStatus.WAITING_STAMP),
    LOAN(GameStatus.WAITING_LOAN),
    FISHING(GameStatus.WAITING_FISHING),
    KK(GameStatus.WAITING_KK);

    private final GameStatus nextStatus;

    TileType(GameStatus nextStatus) {
        this.nextStatus = nextStatus;
    }

    public GameStatus getNextStatus() {
        return nextStatus;
    }
}
