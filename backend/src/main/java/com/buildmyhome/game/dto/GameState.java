package com.buildmyhome.game.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;


@Getter
@Setter
public class GameState {
    // 룸 정보
    private final Long roomId;
    private final int totalRounds;

    // 게임 진행 정보
    private int currentRound = 1;
    private GameStatus status;

    // 턴 순서 제어 (플레이어 ID를 순서대로 보관)
    private List<Long> turnOrder = new ArrayList<>();
    private int currentTurnIndex = 0;
    private Long currentPlayerId;   // 현재 플레이어(주사위 굴리는 플레이어)

    // 시작전 순서 정하기용 임시 데이터 (주사위 숫자 중복 선택 못하게 선언)
    private final List<Integer> availableDiceNumbers = Collections.synchronizedList(new ArrayList<>(Arrays.asList(1, 2, 3, 4, 5, 6)));

    // 플레이어 서버메모리 (플레이어별 상세 상태)
    private Map<Long, GamePlayerState> players = new ConcurrentHashMap<>();

    // 게임 종료
    private boolean isGameOver = false;
    private Long winnerId;

    public GameState(Long roomId, int totalRounds) {
        this.roomId = roomId;
        this.totalRounds = totalRounds;
        this.status = GameStatus.INTRO;
    }

    // 다음 턴으로 넘기는 메서드
    public void nextTurn() {
        if (turnOrder.isEmpty()) {
            throw new IllegalStateException("턴 순서가 설정되지 않았습니다.");
        }

        this.currentTurnIndex = (this.currentTurnIndex + 1) % turnOrder.size();
        this.currentPlayerId = turnOrder.get(currentTurnIndex);

        // 한 바퀴 다 돌면 라운드 증가
        if (currentTurnIndex == 0) {
            this.currentRound++;
        }

        this.status = GameStatus.WAITING_DICE;
    }

    public void addPlayer(GamePlayerState player) {
        players.put(player.getMemberId(), player);
    }
}