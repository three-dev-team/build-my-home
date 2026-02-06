package com.buildmyhome.house.constants;

import com.buildmyhome.game.dto.ResourceType;

import java.util.Arrays;
import java.util.Map;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum HouseLevel {
    NONE(0, "없음", 0, Map.of()),
    LAND(1, "땅", 300, Map.of()),
    TENT(2, "텐트", 500, Map.of(
            ResourceType.CLOTH, 1,
            ResourceType.IRON, 1
    )),
    HOUSE_1(3, "작은집", 1000, Map.of(
            ResourceType.IRON, 2,
            ResourceType.CLAY, 2,
            ResourceType.WOOD, 2
    )),
    HOUSE_2(4, "큰집", 1800, Map.of(
            ResourceType.IRON, 3,
            ResourceType.CLAY, 3,
            ResourceType.WOOD, 3,
            ResourceType.BRICK, 3
    )),
    HOUSE_3(5, "마이홈", 3000, Map.of(
            ResourceType.IRON, 5,
            ResourceType.CLAY, 5,
            ResourceType.BRICK, 5,
            ResourceType.CLOTH, 5,
            ResourceType.WALLPAPER, 5,
            ResourceType.FLOORING, 5
    ));

    private final int level;
    private final String name;
    private final int bell;
    private final Map<ResourceType, Integer> requiredResources; // 다음 레벨로 업그레이드하는 데 필요한 재화

    // 다음 레벨을 가져오는 편의 메서드
    public HouseLevel getNext() {
        return Arrays.stream(values())
                .filter((l) -> l.level == this.level + 1)
                .findFirst()
                .orElse(null);
    }

    // 이전 레벨을 가져오는 편의 메서드
    public HouseLevel getPrev() {
        return Arrays.stream(values())
                .filter((l) -> l.level == this.level - 1)
                .findFirst()
                .orElse(null);
    }
}
