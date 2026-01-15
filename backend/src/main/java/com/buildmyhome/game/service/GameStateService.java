package com.buildmyhome.game.service;

import com.buildmyhome.game.dto.GameState;

public interface GameStateService {
    void saveGame(Long roomId, GameState gameState);
}
