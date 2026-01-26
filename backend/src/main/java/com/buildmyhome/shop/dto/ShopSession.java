package com.buildmyhome.shop.dto;

import com.buildmyhome.game.dto.ShopItemType;
import lombok.Getter;
import lombok.Setter;

import java.util.EnumSet;
import java.util.Set;

@Getter
@Setter
public class ShopSession {

  private String shopSessionId;                 // 세션 고유 ID
  private Long memberId;                        // 누가 이용 중인지
  private Set<ShopItemType> purchasedItems = EnumSet.noneOf(ShopItemType.class);;     // 이미 구매한 아이템 종류
}
