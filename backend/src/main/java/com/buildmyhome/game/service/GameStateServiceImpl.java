package com.buildmyhome.game.service;

import com.buildmyhome.game.dto.GameState;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class GameStateServiceImpl implements GameStateService {

    // 게임 상태를 룸 ID별로 관리 (서버메모리)
    private final Map<Long, GameState> gameStates = new ConcurrentHashMap<>();

    @Override
    public void saveGame(Long roomId, GameState gameState) {
        gameStates.put(roomId, gameState);
    }

    @Override
    public GameState getGame(Long roomId) {
        return gameStates.get(roomId);
    }
}
