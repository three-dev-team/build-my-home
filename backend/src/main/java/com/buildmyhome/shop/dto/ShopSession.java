package com.buildmyhome.shop.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ShopSession {

  // 현재 "상점 이용 상태"를 저장
  private String shopSessionId; // 세션 고유 ID
  private ShopType shopType; // 어떤 상점인지 (아이템 or 재화)
  private Long memberId; // 누가 이용 중인지
  private boolean hasItemPurchased; // 아이템 구매했는지 (1개 제한용)
}
