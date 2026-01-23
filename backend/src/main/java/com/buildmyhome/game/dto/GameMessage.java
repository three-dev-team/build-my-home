package com.buildmyhome.game.dto;

import com.buildmyhome.shop.dto.ShopType;
import lombok.Getter;
import lombok.Setter;

import java.util.List;
import java.util.Map;

@Getter
@Setter
public class GameMessage {
    private String type;
    private Long roomId;
    private Long memberId;
    private String status;

    private List<GamePlayerState> players;
    
    // 상태 동기화를 위한 추가 필드
    private Long currentPlayerId;
    private Integer diceValue;
    private List<Long> turnOrder;
    private int currentRound;
    private int totalRounds;
    private int timeoutSeconds;
    private int uiStep;
    private List<Integer> movePath;     // 플레이어 이동 경로 (칸 인덱스 리스트) -> 프론트 이동 애니메이션용

    private ShopType shopType;          // 어떤 상점인지
    private ItemType itemType;          // 구매/판매할 아이템
    private ResourceType resourceType;  // 구매/판매할 재화
    private HarvestType harvestType;    // 판매할 작물
    private int quantity;               // 수량
    // 대출/스탬프/에러 처리를 위한 추가 필드
    private int amount;

    @com.fasterxml.jackson.annotation.JsonProperty("isBankTile")
    private boolean isBankTile;
    
    private String errorMessage;

    private Map<ResourceType, Integer> gainedResources; // 재화칸 보상
    private Map<HarvestType, Integer> gainedHarvests;   // 과일칸 보상
    private Integer actionData;                         // player state의 actionData 처럼 사용됨(휘발성 데이터 필드)
    private String actionDataStr;                       // 문자열용 휘발성 데이터
}