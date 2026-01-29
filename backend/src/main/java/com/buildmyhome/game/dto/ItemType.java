package com.buildmyhome.game.dto;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

// TODO: 프론트 데이터와 동기화 필요
@Getter
@RequiredArgsConstructor
public enum ItemType {
    PIPE,           // 토관
    CUSTOM_DICE,   // 내맘대로 주사위
    DOUBLE_DICE,    // 더블주사위
    GOLD_DICE,     // 금주사위
    MIRROR;         // 거울
}
