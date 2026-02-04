package com.buildmyhome.game.dto;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

import lombok.Getter;
import lombok.Setter;

import static com.buildmyhome.game.constants.GameConstants.RADISH_PRICE_MAX;
import static com.buildmyhome.game.constants.GameConstants.RADISH_PRICE_MIN;

@Getter
@Setter
public class GameState {

    // 룸 정보
    private final Long roomId;

    // 게임 진행 정보
    private int totalRounds;
    private int currentRound = 1;
    private GameStatus status;

    // 턴 순서 제어 (플레이어 ID를 순서대로 보관)
    private List<Long> turnOrder = new ArrayList<>();
    private int currentTurnIndex = 0;
    private Long currentPlayerId; // 현재 플레이어(주사위 굴리는 플레이어)

    // 시작전 순서 정하기용 임시 데이터 (주사위 숫자 중복 선택 못하게 선언)
    private final List<Integer> availableDiceNumbers = Collections.synchronizedList(
            new ArrayList<>(Arrays.asList(1, 2, 3, 4, 5, 6))
    );

    // 플레이어 서버메모리 (플레이어별 상세 상태)
    private Map<Long, GamePlayerState> players = new ConcurrentHashMap<>();

    // 게임 종료
    private boolean isGameOver = false;
    private Long winnerId;

    // 상점 세션
    private com.buildmyhome.shop.dto.ShopSession shopSession;

    // radish(무) 공용 시세: 라운드 시작마다 1회 변경(10~150)
    private int radishPrice;

    // 상태 변경 시간 (서버 시간 동기화용)
    private java.time.LocalDateTime statusUpdatedAt;
    // 타임아웃 스케줄러 (이벤트 완료 시 취소용)
    private java.util.concurrent.ScheduledFuture<?> currentTimeout;

    public GameState(Long roomId) {
        this.roomId = roomId;
        this.status = GameStatus.INTRO;
        this.statusUpdatedAt = java.time.LocalDateTime.now();
        this.radishPrice = java.util.concurrent.ThreadLocalRandom.current().nextInt(RADISH_PRICE_MIN, RADISH_PRICE_MAX + 1); // 무 초기값 세팅
    }

    public void setStatus(GameStatus status) {
        this.status = status;
        this.statusUpdatedAt = java.time.LocalDateTime.now();
    }

    // 타임아웃 디버깅용 메소드
    public void clearCurrentTimeout() {
        if (this.currentTimeout != null) {
            this.currentTimeout.cancel(false);
            this.currentTimeout = null;
        }
    }

    public void addPlayer(GamePlayerState player) {
        players.put(player.getMemberId(), player);
    }
}
