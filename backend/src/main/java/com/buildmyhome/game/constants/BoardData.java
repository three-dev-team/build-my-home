package com.buildmyhome.game.constants;

import com.buildmyhome.game.dto.GameStatus;

// TODO: 반드시 프론트 데이터(boardData.js)와 일치해야 함

public class BoardData {

    private static final TileType[] TILES = {
//            TileType.START, // 0
//            TileType.RESOURCE, // 1
//            TileType.HARVEST, // 2
//            TileType.SHOP, // 3
//            TileType.STAMP_GAPDOL, // 4
//            TileType.RESOURCE, // 5
//            TileType.LOAN, // 6
//            TileType.HARVEST, // 7
//            TileType.ITEM, // 8
//            TileType.STAMP_MUSEUM, // 9
//            TileType.RESOURCE, // 10
//            TileType.FISHING, // 11
//            TileType.KK, // 12
//            TileType.HARVEST, // 13
//            TileType.STAMP_AIRPORT, // 14
//            TileType.MACHURILLA, // 15
//            TileType.RESOURCE, // 16
//            TileType.HARVEST, // 17
//            TileType.SWAP, // 18
//            TileType.RESOURCE, // 19
//            TileType.ITEM, // 20
//            TileType.MUPANI, // 21
//            TileType.HARVEST, // 22
//            TileType.FISHING, // 23
            TileType.RESOURCE, // 0
            TileType.SWAP, // 1
            TileType.SWAP, // 2
            TileType.SWAP, // 3
            TileType.SWAP, // 4
            TileType.SWAP, // 5
            TileType.SWAP, // 6
            TileType.HARVEST, // 7
            TileType.HARVEST, // 8
            TileType.HARVEST, // 9
            TileType.HARVEST, // 10
            TileType.HARVEST, // 11
            TileType.HARVEST, // 12
            TileType.MACHURILLA, // 13
            TileType.MACHURILLA, // 14
            TileType.MACHURILLA, // 15
            TileType.MACHURILLA, // 16
            TileType.MACHURILLA, // 17
            TileType.MACHURILLA, // 18
            TileType.RESOURCE, // 19
            TileType.RESOURCE, // 20
            TileType.RESOURCE, // 21
            TileType.RESOURCE, // 22
            TileType.RESOURCE, // 23
    };

    public static TileType getTileType(int position) {
        return TILES[position];
    }

    public static GameStatus getNextStatus(int position) {
        return TILES[position].getNextStatus();
    }
}
