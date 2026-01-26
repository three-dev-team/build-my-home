package com.buildmyhome.shop.service;

import com.buildmyhome.game.dto.GameMessage;
import com.buildmyhome.game.dto.HarvestType;
import com.buildmyhome.game.dto.ResourceType;
import com.buildmyhome.game.dto.ItemType;

public interface ShopService {
  // 상점 세션 시작
  void startShopSession(Long roomId, Long memberId);

  // relay 메시지 생성 메서드(선택하는거 보여지게)
  GameMessage relayMessage(Long roomId, Long memberId, GameMessage request);

  // 아이템 구매 (1회만 가능)
  void buyItem(Long roomId, Long memberId, ItemType itemType);

  // 재화 구매
  void buyResource(Long roomId, Long memberId, ResourceType resourceType, int quantity);

  // 재화 판매
  void sellResource(Long roomId, Long memberId, ResourceType resourceType, int quantity);

  // 수확물 판매
  void sellHarvest(Long roomId, Long memberId, HarvestType harvestType, int quantity);

  // 상점 종료
  void endShopSession(Long roomId, Long memberId);
}
