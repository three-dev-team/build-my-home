package com.buildmyhome.game.service;

import com.buildmyhome.game.dto.GameState;

public interface GameStateService {
    void saveGame(Long roomId, GameState gameState);

    GameState getGame(Long roomId);

    void calculateRanking(Long roomId);

    void turnToNextPlayer(Long roomId);
}
