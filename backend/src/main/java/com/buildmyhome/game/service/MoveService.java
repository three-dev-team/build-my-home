package com.buildmyhome.game.service;

import com.buildmyhome.game.dto.GamePlayerState;
import java.util.List;

public interface MoveService {
  void movePlayer(GamePlayerState player, int diceValue);
}
