package com.buildmyhome.shop.controller;

import com.buildmyhome.game.dto.GameMessage;
import com.buildmyhome.game.dto.GameState;
import com.buildmyhome.game.dto.HarvestType;
import com.buildmyhome.game.dto.ItemType;
import com.buildmyhome.game.dto.ResourceType;
import com.buildmyhome.game.service.GameStateService;
import com.buildmyhome.shop.dto.ShopMessage;
import com.buildmyhome.shop.dto.ShopType;
import com.buildmyhome.shop.service.ShopService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.ArrayList;

@Controller
@RequiredArgsConstructor
public class ShopWsController {
  private final SimpMessagingTemplate simpMessagingTemplate;
  private final ShopService shopService;
  private final GameStateService gameStateService;

  /* 상점 세션 시작 */
  @MessageMapping("/shop/start")
  public void startShop(ShopMessage message, Principal principal) {
    Long roomId = message.getRoomId();
    Long memberId = Long.parseLong(principal.getName());
    ShopType shopType = message.getShopType();

    try {
      shopService.startShopSession(roomId, memberId, shopType);

      GameState gameState = gameStateService.getGame(roomId);

      GameMessage response = new GameMessage();
      response.setType("SHOP_STARTED");
      response.setRoomId(roomId);
      response.setMemberId(memberId);
      response.setStatus(gameState.getStatus().name());
      response.setPlayers(new ArrayList<>(gameState.getPlayers().values()));

      simpMessagingTemplate.convertAndSend("/topic/games/" + roomId, response);
    } catch (Exception e) {
      sendErrorMessage(roomId, memberId, e.getMessage());
    }
  }

  /* 아이템 구매 */
  @MessageMapping("/shop/buy-item")
  public void buyItem(ShopMessage message, Principal principal) {
    Long roomId = message.getRoomId();
    Long memberId = Long.parseLong(principal.getName());
    ItemType itemType = message.getItemType();

    try {
      shopService.buyItem(roomId, memberId, itemType);

      GameState gameState = gameStateService.getGame(roomId);

      GameMessage response = new GameMessage();
      response.setType("ITEM_PURCHASED");
      response.setRoomId(roomId);
      response.setMemberId(memberId);
      response.setStatus(gameState.getStatus().name());
      response.setPlayers(new ArrayList<>(gameState.getPlayers().values()));

      simpMessagingTemplate.convertAndSend("/topic/games/" + roomId, response);
    } catch (Exception e) {
      sendErrorMessage(roomId, memberId, e.getMessage());
    }
  }

  /* 재화 구매 */
  @MessageMapping("/shop/buy-resource")
  public void buyResource(ShopMessage message, Principal principal) {
    Long roomId = message.getRoomId();
    Long memberId = Long.parseLong(principal.getName());
    ResourceType resourceType = message.getResourceType();
    int quantity = message.getQuantity();

    try {
      shopService.buyResource(roomId, memberId, resourceType, quantity);

      GameState gameState = gameStateService.getGame(roomId);

      GameMessage response = new GameMessage();
      response.setType("RESOURCE_PURCHASED");
      response.setRoomId(roomId);
      response.setMemberId(memberId);
      response.setStatus(gameState.getStatus().name());
      response.setPlayers(new ArrayList<>(gameState.getPlayers().values()));

      simpMessagingTemplate.convertAndSend("/topic/games/" + roomId, response);
    } catch (Exception e) {
      sendErrorMessage(roomId, memberId, e.getMessage());
    }
  }

  /* 재화 판매 */
  @MessageMapping("/shop/sell-resource")
  public void sellResource(ShopMessage message, Principal principal) {
    Long roomId = message.getRoomId();
    Long memberId = Long.parseLong(principal.getName());
    ResourceType resourceType = message.getResourceType();
    int quantity = message.getQuantity();

    try {
      shopService.sellResource(roomId, memberId, resourceType, quantity);

      GameState gameState = gameStateService.getGame(roomId);

      GameMessage response = new GameMessage();
      response.setType("RESOURCE_SOLD");
      response.setRoomId(roomId);
      response.setMemberId(memberId);
      response.setStatus(gameState.getStatus().name());
      response.setPlayers(new ArrayList<>(gameState.getPlayers().values()));

      simpMessagingTemplate.convertAndSend("/topic/games/" + roomId, response);
    } catch (Exception e) {
      sendErrorMessage(roomId, memberId, e.getMessage());
    }
  }

  /* 작물 판매 */
  @MessageMapping("/shop/sell-harvest")
  public void sellHarvest(ShopMessage message, Principal principal) {
    Long roomId = message.getRoomId();
    Long memberId = Long.parseLong(principal.getName());
    HarvestType harvestType = message.getHarvestType();
    int quantity = message.getQuantity();

    try {
      shopService.sellHarvest(roomId, memberId, harvestType, quantity);

      GameState gameState = gameStateService.getGame(roomId);

      GameMessage response = new GameMessage();
      response.setType("HARVEST_SOLD");
      response.setRoomId(roomId);
      response.setMemberId(memberId);
      response.setStatus(gameState.getStatus().name());
      response.setPlayers(new ArrayList<>(gameState.getPlayers().values()));

      simpMessagingTemplate.convertAndSend("/topic/games/" + roomId, response);
    } catch (Exception e) {
      sendErrorMessage(roomId, memberId, e.getMessage());
    }
  }

  /* 상점 종료 */
  @MessageMapping("/shop/end")
  public void endShop(ShopMessage message, Principal principal) {
    Long roomId = message.getRoomId();
    Long memberId = Long.parseLong(principal.getName());

    try {
      shopService.endShopSession(roomId, memberId);

      GameState gameState = gameStateService.getGame(roomId);

      GameMessage response = new GameMessage();
      response.setType("SHOP_ENDED");
      response.setRoomId(roomId);
      response.setMemberId(memberId);
      response.setStatus(gameState.getStatus().name());
      response.setPlayers(new ArrayList<>(gameState.getPlayers().values()));

      simpMessagingTemplate.convertAndSend("/topic/games/" + roomId, response);
    } catch (Exception e) {
      sendErrorMessage(roomId, memberId, e.getMessage());
    }
  }

  /* 에러 메시지 전송 */
  private void sendErrorMessage(Long roomId, Long memberId, String errorMessage) {
    GameMessage errorResponse = new GameMessage();
    errorResponse.setType("SHOP_ERROR");
    errorResponse.setRoomId(roomId);
    errorResponse.setMemberId(memberId);
    errorResponse.setStatus(errorMessage);

    simpMessagingTemplate.convertAndSend("/topic/games/" + roomId, errorResponse);
  }
}
