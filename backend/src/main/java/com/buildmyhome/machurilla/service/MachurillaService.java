package com.buildmyhome.machurilla.service;

import com.buildmyhome.game.dto.GamePlayerState;
import com.buildmyhome.game.dto.GameState;

public interface MachurillaService {
    void applyCardEffect(GameState gameState, GamePlayerState player, String cardType);
}
