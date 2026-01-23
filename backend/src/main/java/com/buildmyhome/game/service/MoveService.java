package com.buildmyhome.game.service;

import com.buildmyhome.game.dto.GamePlayerState;

public interface MoveService {
    void movePlayer(GamePlayerState player, int diceValue);
}
