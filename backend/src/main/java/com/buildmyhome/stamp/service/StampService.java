package com.buildmyhome.stamp.service;

import com.buildmyhome.game.dto.GamePlayerState;

public interface StampService {
  boolean collectStamp(GamePlayerState player, String actionDataStr);

  int exchangeStamps(GamePlayerState player);
}
