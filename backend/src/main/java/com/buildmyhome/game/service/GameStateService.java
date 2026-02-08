package com.buildmyhome.game.service;

import com.buildmyhome.game.dto.GameState;

import java.util.Map;

public interface GameStateService {
    void saveGame(Long roomId, GameState gameState);

    // 방번호를 알고 있을때 게임 불러오기
    GameState getGame(Long roomId);

    void calculateRanking(Long roomId);

    void turnToNextPlayer(Long roomId);

    // 서버 메모리에 있는 현재 진행 중인 모든 방의 게임 상태를 가져오기
    Map<Long, GameState> getAllGames();

    String removePlayerFromGame(Long roomId, Long memberId);
}
