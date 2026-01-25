package com.buildmyhome.game.service;

import com.buildmyhome.game.constants.GameConstants;
import com.buildmyhome.game.dto.GamePlayerState;
import com.buildmyhome.game.dto.GameState;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import com.buildmyhome.game.dto.GameStatus;
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

    @Override
    public void turnToNextPlayer(Long roomId) {
        GameState gameState = gameStates.get(roomId);
        if (gameState == null) return;
        synchronized (gameState) {
            // [중요] 기존 타임아웃 해제
            gameState.clearCurrentTimeout();
            if (gameState.getTurnOrder().isEmpty()) {
                throw new IllegalStateException("턴 순서가 설정되지 않았습니다.");
            }

            int nextPlayerIndex = (gameState.getCurrentTurnIndex() + 1) % gameState.getTurnOrder().size();
            gameState.setCurrentTurnIndex(nextPlayerIndex);
            gameState.setCurrentPlayerId(gameState.getTurnOrder().get(nextPlayerIndex));

            if (nextPlayerIndex == 0) {
                turnToNextRound(gameState);
            }

            GamePlayerState currentPlayer = gameState.getPlayers().get(gameState.getCurrentPlayerId());

            // 다음 사람에게 턴 넘기기 전 청소
            if (currentPlayer != null) {
                currentPlayer.setMovePath(null);
                currentPlayer.setUiStep(0);
                currentPlayer.setActionData(null);
                currentPlayer.setActionDataStr(null);
            }

            gameState.setStatus(GameStatus.WAITING_PLAYER_ACTION);
            gameState.setStatusUpdatedAt(LocalDateTime.now());
        }
    }

    // 라운드 증가 처리 메서드
    private void turnToNextRound(GameState gameState) {
        gameState.setCurrentRound(gameState.getCurrentRound() + 1); // 라운드 증가
        // 라운드 시작 순간: 무 시세 1회 변경(방 공용)
        gameState.setRadishPrice(java.util.concurrent.ThreadLocalRandom.current().nextInt(
                GameConstants.RADISH_PRICE_MIN, GameConstants.RADISH_PRICE_MAX + 1
        ));

        for (GamePlayerState p : gameState.getPlayers().values()) {
            Integer removeRound = p.getRadishRemoveRound();
            if (removeRound != null && removeRound <= gameState.getCurrentRound() && p.getRadishQty() > 0) {
                p.setRadishQty(0);
                p.setRadishRemoveRound(null);
            }
        }

    }
}
