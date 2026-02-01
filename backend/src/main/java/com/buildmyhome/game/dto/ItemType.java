package com.buildmyhome.game.dto;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

import java.util.Arrays;

@Getter
@RequiredArgsConstructor
public enum ItemType {

    CUSTOM_DICE("custom_dice"),       // 내맘대로주사위
    DORUMUK("dorumuk"),               // 도루묵전화기
    DOUBLE_DICE("double_dice"),       // 더블주사위
    FISHING_CHANCE("fishing_chance"), // 떡밥
    GOLD_DICE("gold_dice"),           // 금주사위
    KK_TICKET("kk_ticket"),           // K.K. 티켓
    MIRROR("mirror"),                 // 거울
    PIPE("pipe"),                     // 파이프
    TARANTULA("tarantula"),           // 타란튤라
    WATERING("watering");             // 물뿌리개

    private final String key;

    public static ItemType fromKey(String key) {
        if (key == null || key.isBlank()) {
            throw new IllegalArgumentException("ItemType key is null/blank");
        }
        return Arrays.stream(values())
                .filter(t -> t.key.equals(key))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown ItemType key: " + key));
    }
}
