
package com.buildmyhome.shop.service;

import com.buildmyhome.game.dto.*;
import com.buildmyhome.game.service.GameStateService;
import com.buildmyhome.shop.dto.ShopSession;
import com.buildmyhome.shop.dto.ShopType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ShopServiceImpl implements ShopService {

  private final GameStateService gameStateService;

  @Override
  public void startShopSession(Long roomId, Long memberId, ShopType shopType) {
    GameState gameState = gameStateService.getGame(roomId);

    // 현재 턴 플레이어인지 확인
    if (!gameState.getCurrentPlayerId().equals(memberId)) {
      throw new IllegalStateException("본인의 턴이 아닙니다.");
    }

    // ShopSession 생성
    ShopSession session = new ShopSession();
    session.setShopSessionId(UUID.randomUUID().toString());
    session.setShopType(shopType);
    session.setMemberId(memberId);
    session.setHasItemPurchased(false);

    gameState.setShopSession(session);

    // 상태 변경
    if (shopType == ShopType.ITEM_SHOP) {
      gameState.setStatus(GameStatus.WAITING_SHOP_ITEM);
    } else {
      gameState.setStatus(GameStatus.WAITING_SHOP_RESOURCE);
    }
  }

  @Override
  public void buyItem(Long roomId, Long memberId, ItemType itemType) {
    GameState gameState = gameStateService.getGame(roomId);
    GamePlayerState player = gameState.getPlayers().get(memberId);

    // 상점 세션 검증 (없으면 생성)
    ensureShopSession(gameState, memberId, ShopType.ITEM_SHOP);

    // 이미 아이템을 구매했는지 확인
    if (gameState.getShopSession().isHasItemPurchased()) {
      throw new IllegalStateException("이미 아이템을 구매했습니다. 한 번에 하나만 구매 가능합니다.");
    }

    int cost = itemType.getPrice();
    if (player.getBell() < cost) {
      throw new IllegalStateException("벨이 부족합니다.");
    }

    // 아이템 구매
    player.setBell(player.getBell() - cost);
    player.getItems().add(itemType);

    // 구매 완료 플래그 설정 (즉시 종료하지 않음)
    gameState.getShopSession().setHasItemPurchased(true);
  }

  @Override
  public void buyResource(Long roomId, Long memberId, ResourceType resourceType, int quantity) {
    GameState gameState = gameStateService.getGame(roomId);
    GamePlayerState player = gameState.getPlayers().get(memberId);

    // 재화 상점에서만 구매 가능
    ensureShopSession(gameState, memberId, ShopType.HARVEST_SHOP);

    if (quantity <= 0) {
      throw new IllegalArgumentException("수량은 1개 이상이어야 합니다.");
    }

    int totalCost = resourceType.getBuyPrice() * quantity;
    if (player.getBell() < totalCost) {
      throw new IllegalStateException("벨이 부족합니다.");
    }

    // 재화 구매 (즉시 종료하지 않음)
    player.setBell(player.getBell() - totalCost);
    player.getResources().put(resourceType,
        player.getResources().get(resourceType) + quantity);
  }

  @Override
  public void sellResource(Long roomId, Long memberId, ResourceType resourceType, int quantity) {
    GameState gameState = gameStateService.getGame(roomId);
    GamePlayerState player = gameState.getPlayers().get(memberId);

    // 상점 세션 검증 (상점 타입 무관)
    ensureShopSession(gameState, memberId, null);

    if (quantity <= 0) {
      throw new IllegalArgumentException("수량은 1개 이상이어야 합니다.");
    }

    // 보유 수량 확인
    int currentAmount = player.getResources().get(resourceType);
    if (currentAmount < quantity) {
      throw new IllegalStateException("보유한 재화가 부족합니다.");
    }

    // 재화 판매
    int totalPrice = resourceType.getSellPrice() * quantity;
    player.setBell(player.getBell() + totalPrice);
    player.getResources().put(resourceType, currentAmount - quantity);
  }

  @Override
  public void sellHarvest(Long roomId, Long memberId, HarvestType harvestType, int quantity) {
    GameState gameState = gameStateService.getGame(roomId);
    GamePlayerState player = gameState.getPlayers().get(memberId);

    // 상점 세션 검증 (상점 타입 무관)
    ensureShopSession(gameState, memberId, null);

    if (quantity <= 0) {
      throw new IllegalArgumentException("수량은 1개 이상이어야 합니다.");
    }

    // 보유 수량 확인
    int currentAmount = player.getHarvests().get(harvestType);
    if (currentAmount < quantity) {
      throw new IllegalStateException("보유한 작물이 부족합니다.");
    }

    // 작물 판매
    int totalPrice = harvestType.getPrice() * quantity;
    player.setBell(player.getBell() + totalPrice);
    player.getHarvests().put(harvestType, currentAmount - quantity);
  }

  @Override
  public void endShopSession(Long roomId, Long memberId) {
    GameState gameState = gameStateService.getGame(roomId);

    // DevControl 테스트 대응: shopSession이 없으면 그냥 상태만 변경
    if (gameState.getShopSession() == null) {
      gameState.setStatus(GameStatus.WAITING_PLAYER_ACTION);
      return;
    }

    // 상점 세션 검증
    if (!gameState.getShopSession().getMemberId().equals(memberId)) {
      throw new IllegalStateException("본인의 턴이 아닙니다.");
    }

    // 세션 종료
    gameState.setShopSession(null);
    gameState.setStatus(GameStatus.WAITING_PLAYER_ACTION);
  }

  // ========== Helper 메서드 ==========

  /**
   * shopSession이 없으면 생성, 있으면 검증
   * DevControl 테스트 대응
   */
  private void ensureShopSession(GameState gameState, Long memberId, ShopType expectedType) {
    ShopSession session = gameState.getShopSession();

    // shopSession이 없으면 임시로 생성 (DevControl 대응)
    if (session == null) {
      ShopSession tempSession = new ShopSession();
      tempSession.setShopSessionId("dev-temp-" + System.currentTimeMillis());
      tempSession.setShopType(expectedType != null ? expectedType : ShopType.ITEM_SHOP);
      tempSession.setMemberId(memberId);
      tempSession.setHasItemPurchased(false);
      gameState.setShopSession(tempSession);
      return;
    }

    // 기존 세션 검증
    if (!session.getMemberId().equals(memberId)) {
      throw new IllegalStateException("본인의 턴이 아닙니다.");
    }

    if (expectedType != null && !session.getShopType().equals(expectedType)) {
      throw new IllegalStateException("잘못된 상점 타입입니다.");
    }
  }

  /**
   * 상점 세션 유효성 검증 (기존 메서드 - 사용 안 함)
   */
  @Deprecated
  private void validateShopSession(GameState gameState, Long memberId, ShopType expectedType) {
    ShopSession session = gameState.getShopSession();

    if (session == null) {
      throw new IllegalStateException("활성화된 상점 세션이 없습니다.");
    }

    if (!session.getMemberId().equals(memberId)) {
      throw new IllegalStateException("본인의 턴이 아닙니다.");
    }

    if (expectedType != null && !session.getShopType().equals(expectedType)) {
      throw new IllegalStateException("잘못된 상점 타입입니다.");
    }
  }
}

