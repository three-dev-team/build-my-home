package com.buildmyhome.game.service;

import com.buildmyhome.game.constants.GameConstants;
import com.buildmyhome.game.dto.GamePlayerState;
import com.buildmyhome.game.dto.GameState;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;

import com.buildmyhome.game.dto.GameStatus;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
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
            gameState.clearCurrentTimeout();
            if (gameState.getTurnOrder().isEmpty()) {
                throw new IllegalStateException("턴 순서가 설정되지 않았습니다.");
            }

            // ★ 현재 플레이어 턴 완료 처리 (다음 플레이어로 바꾸기 전에)
            Long finishedId = gameState.getCurrentPlayerId();
            if (gameState.getPlayersYetToPlay() != null) {
                GamePlayerState finishedPlayer = gameState.getPlayers().get(finishedId);
                if (finishedPlayer != null) {
                    finishedPlayer.setLastPlayedRound(gameState.getCurrentRound());
                }
                gameState.getPlayersYetToPlay().remove(finishedId);
                gameState.getPlayersYetToPlay().removeIf(id -> {
                    GamePlayerState p = gameState.getPlayers().get(id);
                    return p == null || p.isDisconnected();
                });

                // ★ 라운드 종료 체크 (이것만으로 라운드 증가 — index==0 기준 삭제)
                if (gameState.getPlayersYetToPlay().isEmpty()) {
                    turnToNextRound(gameState);
                }
            }

            // 다음 플레이어 선정
            int nextPlayerIndex = (gameState.getCurrentTurnIndex() + 1) % gameState.getTurnOrder().size();
            gameState.setCurrentTurnIndex(nextPlayerIndex);
            gameState.setCurrentPlayerId(gameState.getTurnOrder().get(nextPlayerIndex));

            // ★ 삭제: if (nextPlayerIndex == 0) { turnToNextRound(gameState); }

            GamePlayerState currentPlayer = gameState.getPlayers().get(gameState.getCurrentPlayerId());
            if (currentPlayer != null) {
                currentPlayer.clearTurnData();
                currentPlayer.setItemUsed(false);
                if (currentPlayer.getSkipNextTurnCount() > 0) {
                    currentPlayer.setSkipNextTurnCount(currentPlayer.getSkipNextTurnCount() - 1);
                    gameState.setStatus(GameStatus.PLAYER_SKIPPED);
                } else {
                    gameState.setStatus(GameStatus.WAITING_PLAYER_ACTION);
                }
            }
            gameState.setStatusUpdatedAt(LocalDateTime.now());
        }
    }

    @Override
    public Map<Long, GameState> getAllGames() {
        return gameStates;
    }

    // 이탈 플레이어 게임에서 제거 메소드
    @Override
    public String removePlayerFromGame(Long roomId, Long memberId) {
        GameState gameState = gameStates.get(roomId);
        if (gameState == null) return "GAME_NOT_FOUND";

        synchronized (gameState) {
            // 1. 이탈한 플레이어 마킹
            GamePlayerState player = gameState.getPlayers().get(memberId);
            if (player == null) return "PLAYER_NOT_FOUND";
            player.setDisconnected(true);
            player.setDisconnectedAt(java.time.LocalDateTime.now());

            // 2. turnOrder에서 제거
            List<Long> turnOrder = gameState.getTurnOrder();
            int idx = turnOrder.indexOf(memberId);
            // 현재턴이 이탈한 플레이어 턴이었을 경우 방어 위한 필드
            boolean wasCurrentTurn = memberId.equals(gameState.getCurrentPlayerId());

            // 이미 제거되었을겨우(이탈 3중 방어 관련)
            if (idx == -1) {
                log.info(">>> ⚠️ 이미 turnOrder에서 제거된 플레이어 - memberId: {}, roomId: {}", memberId, roomId);
                return "PLAYER_ALREADY_REMOVED";
            }

            turnOrder.remove(idx);
            if (gameState.getPlayersYetToPlay() != null) {
                gameState.getPlayersYetToPlay().remove(memberId);
            }

            // 3. 남은 플레이어 1명 이하면 게임 종료
            if (turnOrder.size() <= 1) {
                log.info(">>> ⚠️플레이어 이탈로 게임 종료 - 남은 인원: {}, roomId: {}", turnOrder.size(), roomId);
                gameState.clearCurrentTimeout();
                calculateRanking(roomId);
                gameState.setStatus(GameStatus.FINISHED);
                gameState.setGameOver(true);
                return "GAME_OVER";
            }

            // 4. 인덱스 보정
            int currentIdx = gameState.getCurrentTurnIndex();
            if (wasCurrentTurn) {
                // 막턴인 사람이 나갔을 경우
                if (currentIdx >= turnOrder.size()) {
                    gameState.setCurrentTurnIndex(0);
                }

                if (gameState.getPlayersYetToPlay() != null && gameState.getPlayersYetToPlay().isEmpty()) {
                    turnToNextRound(gameState);
                }
                // 새 현재 플레이어 세팅
                // 막턴이었던 사람이 나가면 0번째 사람 차례로 세팅
                Long updatedPlayerId = turnOrder.get(gameState.getCurrentTurnIndex());
                gameState.setCurrentPlayerId(updatedPlayerId);
                GamePlayerState updatedPlayer = gameState.getPlayers().get(updatedPlayerId);
                if (updatedPlayer != null) {
                    updatedPlayer.clearTurnData();
                    updatedPlayer.setItemUsed(false);
                    gameState.setLeftPlayerId(memberId);  // 이탈한 플레이어 ID 저장
                    gameState.setStatus(GameStatus.PLAYER_LEFT);
                    gameState.setStatusUpdatedAt(java.time.LocalDateTime.now());
                }
                return "NEXT_TURN";

            } else if (idx < currentIdx) {
                // 현재턴보다 앞 사람이 빠짐, 현재턴인사람 idx 조정
                gameState.setCurrentTurnIndex(currentIdx - 1);
            }
            return "REMOVED";
        }
    }

    @Override
    public void rejoinPlayer(Long roomId, Long memberId) {
        GameState gameState = gameStates.get(roomId);
        if (gameState == null) return;

        synchronized (gameState) {
            GamePlayerState player = gameState.getPlayers().get(memberId);
            if (player == null || !player.isDisconnected()) return;

            // 0. PLAYER_LEFT 연출 중 본인 복귀 시 상태 복구
            if (gameState.getStatus() == GameStatus.PLAYER_LEFT &&
                    Objects.equals(gameState.getLeftPlayerId(), memberId)) {
                gameState.setLeftPlayerId(null);
                gameState.setStatus(GameStatus.WAITING_PLAYER_ACTION);
            }

            // 1. disconnected 해제
            player.setDisconnected(false);
            player.setDisconnectedAt(null);

            // 2. turnOrder에 원래 위치로 복원
            List<Long> turnOrder = gameState.getTurnOrder();
            if (turnOrder.contains(memberId)) {
                // 이미 turnOrder에 있으면 playersYetToPlay만 조건부 추가
                // (아직 차례가 안 왔으면 이번 라운드 참여 가능)
                if (gameState.getPlayersYetToPlay() != null) {
                    if (player.getLastPlayedRound() < gameState.getCurrentRound()) {
                        gameState.getPlayersYetToPlay().add(memberId);
                    }
                }
                log.info(">>> ✅ 플레이어 복귀 - memberId: {}, roomId: {}, turnOrder: {}", memberId, roomId, turnOrder);
                return;
            }

            List<Long> original = gameState.getOriginalTurnOrder();
            if (original == null || original.isEmpty()) {
                turnOrder.add(memberId);
            } else {
                int origIdx = original.indexOf(memberId);
                if (origIdx < 0) {
                    turnOrder.add(memberId); // fallback: 맨 뒤
                } else {
                    // originalTurnOrder에서 뒤에 있는 첫 활성 플레이어 앞에 삽입
                    int insertIdx = turnOrder.size();
                    for (int j = 1; j < original.size(); j++) {
                        Long nextId = original.get((origIdx + j) % original.size());
                        int posInCurrent = turnOrder.indexOf(nextId);
                        if (posInCurrent >= 0) {
                            insertIdx = posInCurrent;
                            break;
                        }
                    }
                    turnOrder.add(insertIdx, memberId);
                }
            }

            // 3. currentTurnIndex 보정 (turnOrder 삽입으로 인덱스 밀림 방지)
            int currentPlayerIdx = turnOrder.indexOf(gameState.getCurrentPlayerId());
            if (currentPlayerIdx >= 0) {
                gameState.setCurrentTurnIndex(currentPlayerIdx);
            }

            // 4. playersYetToPlay 조건부 추가 (아직 차례 안 왔으면 이번 라운드 참여)
            if (gameState.getPlayersYetToPlay() != null) {
                if (player.getLastPlayedRound() < gameState.getCurrentRound()) {
                    gameState.getPlayersYetToPlay().add(memberId);
                }
            }

            log.info(">>> ✅ 플레이어 복귀 - memberId: {}, roomId: {}, turnOrder: {}", memberId, roomId, turnOrder);
        }
    }

    @Override
    public void removeGame(Long roomId) {
        GameState gameState = gameStates.get(roomId);
        if (gameState != null) {
            gameState.clearCurrentTimeout();
        }
        gameStates.remove(roomId);
    }

    @Override
    public Long findActiveGameByMemberId(Long memberId) {
        for (Map.Entry<Long, GameState> entry : gameStates.entrySet()) {
            GameState gs = entry.getValue();
            if (gs.getPlayers() == null) continue;
            if (gs.isGameOver() || gs.getStatus() == GameStatus.FINISHED) continue;
            boolean found = gs.getPlayers().values().stream()
                    .anyMatch(p -> memberId.equals(p.getMemberId()));
            if (found) return entry.getKey();
        }
        return null;
    }

    @Override
    public void markDisconnected(Long roomId, Long memberId) {
        GameState gameState = gameStates.get(roomId);
        if (gameState == null) return;

        synchronized (gameState) {
            GamePlayerState player = gameState.getPlayers().get(memberId);
            if (player == null) return;
            player.setDisconnected(true);
            player.setDisconnectedAt(LocalDateTime.now());
        }
    }

    // 라운드 증가 처리 메서드
    private void turnToNextRound(GameState gameState) {
        gameState.setCurrentRound(gameState.getCurrentRound() + 1); // 라운드 증가
        gameState.setPlayersYetToPlay(new HashSet<>(gameState.getTurnOrder())); // 시작 순간 현재 접속한 플레이어 등록
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
