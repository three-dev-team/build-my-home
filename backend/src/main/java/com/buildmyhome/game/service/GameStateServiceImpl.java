package com.buildmyhome.game.service;

import com.buildmyhome.game.dto.GameState;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

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

  @Override
  public void calculateRanking(Long roomId) {
    GameState gameState = gameStates.get(roomId);
    if (gameState == null) return;

    synchronized (gameState) {
      java.util.List<com.buildmyhome.game.dto.GamePlayerState> players = new java.util.ArrayList<>(
        gameState.getPlayers().values()
      );

      players.sort((p1, p2) -> {
        // 1. 대출금 (낮은 사람이 승리 = 오름차순)
        if (p1.getLoan() != p2.getLoan()) {
          return Integer.compare(p1.getLoan(), p2.getLoan());
        }
        // 2. 집 레벨 (높은 사람이 승리 = 내림차순)
        if (p1.getHouseLevel() != p2.getHouseLevel()) {
          return p2.getHouseLevel().compareTo(p1.getHouseLevel());
        }
        // 3. 보유 벨 (높은 사람이 승리 = 내림차순)
        if (p1.getBell() != p2.getBell()) {
          return Integer.compare(p2.getBell(), p1.getBell());
        }
        // 4. 주사위 (동점 처리, 여기서는 단순 무작위 or 기존 순서 유지)
        return 0;
      });

      // 랭크 부여 (Dense Ranking: 1, 2, 2, 3...)
      int currentRank = 1;
      for (int i = 0; i < players.size(); i++) {
        com.buildmyhome.game.dto.GamePlayerState p = players.get(i);

        if (i > 0) {
          com.buildmyhome.game.dto.GamePlayerState prev = players.get(i - 1);
          // 대출금, 집, 벨이 모두 같으면 같은 등수
          boolean isTied =
            (p.getLoan() == prev.getLoan()) &&
            (p.getHouseLevel() == prev.getHouseLevel()) &&
            (p.getBell() == prev.getBell());
          if (!isTied) {
            currentRank++;
          }
        }
        p.setRank(currentRank);
      }
    }
  }
}
