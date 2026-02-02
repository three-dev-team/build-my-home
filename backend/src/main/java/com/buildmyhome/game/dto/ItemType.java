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
    GOLD_DICE("gold_dice"),           // 금주사위
    MIRROR("mirror"),                 // 거울
    PIPE("pipe");                     // 파이프

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
