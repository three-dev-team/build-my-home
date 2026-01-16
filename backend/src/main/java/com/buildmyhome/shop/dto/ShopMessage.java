package com.buildmyhome.shop.dto;

import com.buildmyhome.game.dto.HarvestType;
import com.buildmyhome.game.dto.ItemType;
import com.buildmyhome.game.dto.ResourceType;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ShopMessage {
  // 웹소켓 메시지
  private Long roomId;              // 어느 방인지
  private ShopType shopType;        // 어떤 상점인지
  private ItemType itemType;        // 구매/판매할 아이템
  private ResourceType resourceType; // 구매/판매할 재화
  private HarvestType harvestType;  // 판매할 작물
  private int quantity;             // 수량
}
