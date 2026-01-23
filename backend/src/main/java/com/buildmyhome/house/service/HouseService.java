package com.buildmyhome.house.service;

import com.buildmyhome.game.dto.GamePlayerState;

public interface HouseService {
  void updateHouseInfo(GamePlayerState player);

  void upgradeHouse(GamePlayerState player);
}
