package com.buildmyhome.game.dto;

import com.buildmyhome.house.constants.HouseLevel;

import java.util.*;

import lombok.*;

@Getter
@Setter
public class GamePlayerState {

    private static final int MAX_LOAN = 9999;

    // 기본 정보
    private Long memberId;
    private String nickname;
    private Long characterId;

    // 게임 진행 정보
    private Integer orderDiceValue; // 순서 정하기용 주사위 값
    private Integer diceValue; // 주사위 값
    private List<Integer> movePath; // 이동 경로 (칸 인덱스 리스트) -> 프론트 이동 애니메이션용
    private int remainingMoves = 0; // 남은 이동 칸 수 (지나가기 로직 시 사용)
    private int position = 0; // 현재 칸 위치
    private int bell = 100000; // 시작 벨 10
    private int loan = 0; // 대출금
    private int uiStep = 0; // 행동 단계 (특정 상태에서 페이지 이동 로직 시 사용)
    private int rank = 0; // 게임 결과 순위 (1 ~ 4)

    // 행동 관련 추가 공유 휘발성 데이터
    private Integer actionData;
    private String actionDataStr;

    // 아이템 정보
    private boolean itemUsed = false;
    private int skipNextTurnCount = 0;  // 다음 턴 건너뛰기
    private boolean extraDice = false;  // 주사위 한 번 더
    private List<ItemType> items = new ArrayList<>();

    // 재화 정보
    private Map<ResourceType, Integer> resources = new EnumMap<>(ResourceType.class);
    private Map<HarvestType, Integer> harvests = new EnumMap<>(HarvestType.class);
    private Set<StampType> collectedStamps = EnumSet.noneOf(StampType.class);

    // 상점용 아이템
    private List<ShopItemType> shopItems = new ArrayList<>();

    // 무(무파니) 정보
    private int radishQty = 0; // 보유 무 개수
    private Integer radishRemoveRound; // 이 라운드 시작에 자동 제거(구매 라운드 + 3)

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

    public void setLoan(int loan) {
        if (loan < 0) loan = 0;
        this.loan = Math.min(loan, MAX_LOAN);
    }

    // 턴 종료 후 휘발성 데이터 초기화
    public void clearTurnData() {
        this.movePath = null;
        this.uiStep = 0;
        this.diceValue = null;
        this.actionData = null;
        this.actionDataStr = null;
    }
}
