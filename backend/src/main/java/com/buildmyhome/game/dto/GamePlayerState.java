package com.buildmyhome.game.dto;

import com.buildmyhome.house.constants.HouseLevel;
import lombok.*;

import java.util.*;

@Getter
@Setter
public class GamePlayerState {
    // 기본 정보
    private Long memberId;
    private String nickname;
    private Long characterId;

    // 게임 진행 정보
    private Integer orderDiceValue; // 순서 정하기용 주사위 값
    private Integer diceValue; // 주사위 값
    private int remainingMoves = 0; // 남은 이동 칸 수 (지나가기 로직 시 사용)
    private int position = 0; // 현재 칸 위치
    private int bell = 10; // 시작 벨 10
    private int loan = 0; // 대출금
    private int uiStep = 0; // 행동 단계 (특정 상태에서 페이지 이동 로직 시 사용)
    private Integer actionData; // 행동 관련 추가 데이터 (특정 정보가 휘발성으로 필요할 때 사용)
    private int rank = 0; // 게임 결과 순위 (1 ~ 4)

    // 재화 정보
    private Map<ResourceType, Integer> resources = new EnumMap<>(ResourceType.class);
    private Map<HarvestType, Integer> harvests = new EnumMap<>(HarvestType.class);
    private Set<StampType> collectedStamps = EnumSet.noneOf(StampType.class);
    private List<ItemType> items = new ArrayList<>();

    // 집 정보
    private HouseLevel houseLevel = HouseLevel.NONE; // 집 레벨
    private boolean canUpgradeHouse;
    private HouseLevel nextHouseLevel;
    private Map<ResourceType, Integer> requiredResourcesForNextHouse = new EnumMap<>(ResourceType.class);

    public GamePlayerState(Long memberId, String nickname, Long characterId) {
        this.memberId = memberId;
        this.nickname = nickname;
        this.characterId = characterId;
        // 자원 초기화
        for (ResourceType type : ResourceType.values()) {
            resources.put(type, 0);
        }
        // 수확물 초기화
        for (HarvestType type : HarvestType.values()) {
            harvests.put(type, 0);
        }
    }
}
