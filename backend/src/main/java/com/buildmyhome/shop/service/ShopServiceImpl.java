package com.buildmyhome.shop.service;

import com.buildmyhome.game.dto.*;
import com.buildmyhome.game.service.GameStateService;
import com.buildmyhome.shop.dto.ShopSession;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ShopServiceImpl implements ShopService {
    private ShopSession validateShopSession(GameState gameState, Long memberId) {
        if (!gameState.getCurrentPlayerId().equals(memberId)) {
            throw new IllegalStateException("본인의 턴이 아닙니다.");
        }

        ShopSession session = gameState.getShopSession();
        if (session == null) {
            throw new IllegalStateException("활성화된 상점 세션이 없습니다.");
        }

        if (!session.getMemberId().equals(memberId)) {
            throw new IllegalStateException("본인의 상점 거래가 아닙니다.");
        }

        return session;
    }

  private final GameStateService gameStateService;

  @Override
  public void startShopSession(Long roomId, Long memberId) {
    GameState gameState = gameStateService.getGame(roomId);

    // 현재 턴 플레이어인지 확인
    if (!gameState.getCurrentPlayerId().equals(memberId)) {
      throw new IllegalStateException("본인의 턴이 아닙니다.");
    }

    // ShopSession 생성
    ShopSession session = new ShopSession();
    session.setShopSessionId(UUID.randomUUID().toString());
    session.setMemberId(memberId);

    gameState.setShopSession(session);
  }

  @Override
    public GameMessage relayMessage(Long roomId, Long memberId, GameMessage request) {
      GameState gameState = gameStateService.getGame(roomId);

      // 상점 세션 / 턴 검증
      validateShopSession(gameState, memberId);

      // relay 메시지 구성
      GameMessage relay = new GameMessage();
      relay.setType("SHOP_SELECT_RELAY");
      relay.setMemberId(memberId);

      relay.setShopItemType(request.getShopItemType());
      relay.setResourceType(request.getResourceType());
      relay.setHarvestType(request.getHarvestType());
      relay.setQuantity(request.getQuantity());
      relay.setUiStep(request.getUiStep());

      return relay;
    }

  @Override
  public void buyItem(Long roomId, Long memberId, ShopItemType shopItemType) {
    GameState gameState = gameStateService.getGame(roomId);
    GamePlayerState player = gameState.getPlayers().get(memberId);

    ShopSession session = validateShopSession(gameState, memberId);

    // 이미 구매한 아이템인지
    if (session.getPurchasedItems().contains(shopItemType)) {
      throw new IllegalStateException("이미 구매한 아이템입니다.");
    }

    // 벨 확인 및 구매
    int cost = shopItemType.getPrice();
    if (player.getBell() < cost) {
      throw new IllegalStateException("벨이 부족합니다.");
    }
    player.setBell(player.getBell() - cost);

    player.getShopItems().add(shopItemType);

    // 세션에는 상점 상품 기준으로 구매 기록
    session.getPurchasedItems().add(shopItemType);
  }

  @Override
  public void buyResource(Long roomId, Long memberId, ResourceType resourceType, int quantity) {
    GameState gameState = gameStateService.getGame(roomId);
    GamePlayerState player = gameState.getPlayers().get(memberId);

    validateShopSession(gameState, memberId);

    if (quantity <= 0) {
      throw new IllegalArgumentException("수량은 1개 이상이어야 합니다.");
    }

    int totalCost = resourceType.getBuyPrice() * quantity;
    if (player.getBell() < totalCost) {
      throw new IllegalStateException("벨이 부족합니다.");
    }

    player.setBell(player.getBell() - totalCost);
    player.getResources().put(resourceType, player.getResources().get(resourceType) + quantity);
  }

  @Override
  public void sellResource(Long roomId, Long memberId, ResourceType resourceType, int quantity) {
    GameState gameState = gameStateService.getGame(roomId);
    GamePlayerState player = gameState.getPlayers().get(memberId);

    validateShopSession(gameState, memberId);

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

    validateShopSession(gameState, memberId);

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

    validateShopSession(gameState, memberId);

    // 세션 종료
    gameState.setShopSession(null);
    gameState.setStatus(GameStatus.WAITING_PLAYER_ACTION);
  }

}
