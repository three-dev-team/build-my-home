package com.buildmyhome.game.dto;

public enum ItemType {
    CUSTOM_DICE(100),      // 내맘대로 주사위
    PIPE(60),             // 토관
    GOLD_PIPE(150),        // 금토관
    GOLD_DICE(100),        // 금주사위
    DOUBLE_DICE(80),      // 더블주사위
    MIRROR(70),           // 거울
    GOLD_MIRROR(120);      // 금거울

    private final int price;

    ItemType(int price) {
        this.price = price;
    }

    public int getPrice(){return price;}
}
