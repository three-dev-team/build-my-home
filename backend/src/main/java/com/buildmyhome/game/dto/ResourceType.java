package com.buildmyhome.game.dto;

public enum ResourceType {
    WOOD(120, 60),      // 목재
    IRON(80, 40),      // 철광석
    CLOTH(60, 30),     // 천
    BRICK(140, 70),     // 벽돌
    WALLPAPER(200,100), // 벽지
    CLAY(100,50),       // 점토
    FLOOR(160,80);       // 바닥

    private final int buyPrice;
    private final int sellPrice;

    ResourceType(int buyPrice, int sellPrice){
        this.buyPrice = buyPrice;
        this.sellPrice = sellPrice;
    }

    public int getBuyPrice(){
        return buyPrice;
    }

    public int getSellPrice(){
        return sellPrice;
    }
}
