package com.buildmyhome.game.constants;

import com.buildmyhome.game.dto.GameStatus;

public class BoardData {

    private static final TileType[] TILES = {
            TileType.START, // 0
            TileType.FISHING, // 1
            TileType.MUPANI, // 2
            TileType.HARVEST, // 3
            TileType.ITEM, // 4
            TileType.RESOURCE, // 5
            TileType.HARVEST, // 6
            TileType.STAMP_AIRPORT, // 7
            TileType.SHOP, // 8
            TileType.MACHURILLA, // 9
            TileType.LOAN, // 10
            TileType.HARVEST, // 11
            TileType.FISHING, // 12
            TileType.RESOURCE, // 13
            TileType.KK, //14
            TileType.HARVEST, // 15
            TileType.STAMP_MUSEUM, // 16
            TileType.ITEM, // 17
            TileType.HARVEST, // 18
            TileType.LOAN, // 19
            TileType.RESOURCE, // 20
            TileType.SHOP, // 21
            TileType.SWAP, // 22
            TileType.SWAP, // 23
            TileType.STAMP_GAPDOL, // 24
            TileType.HARVEST, // 25
            TileType.FISHING, // 26
            TileType.RESOURCE, // 27
    };

    public static TileType getTileType(int position) {
        return TILES[position];
    }

    public static GameStatus getNextStatus(int position) {
        return TILES[position].getNextStatus();
    }
}
