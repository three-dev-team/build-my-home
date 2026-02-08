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

    void rejoinPlayer(Long roomId, Long memberId);

    void removeGame(Long roomId);

    // memberId로 참여 중인 게임의 roomId 조회 (없으면 null)
    Long findActiveGameByMemberId(Long memberId);
}
