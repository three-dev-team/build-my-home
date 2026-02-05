package com.buildmyhome.swap.service;

import com.buildmyhome.game.dto.*;
import com.buildmyhome.game.service.GameStateService;
import com.buildmyhome.swap.dto.SwapData;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
public class SwapServiceImpl implements SwapService {

    private final GameStateService gameStateService;
    private final ObjectMapper objectMapper;

    // 룰렛 속도 상수
    private static final long PLAYER_CYCLE_MS = 150L;
    private static final long ARROW_CYCLE_MS = 120L;

    // JSON 파싱
    private SwapData parseSwapData(String json) {
        if (json == null || json.isBlank()) return new SwapData();
        try {
            return objectMapper.readValue(json, SwapData.class);
        } catch (Exception e) {
            return new SwapData();
        }
    }

    // JSON 변환
    private String toJson(SwapData data) {
        try {
            return objectMapper.writeValueAsString(data);
        } catch (Exception e) {
            return "{}";
        }
    }

    @Override
    public void confirmPlayer1(Long roomId, Long memberId, Long player1Id) {
        if (roomId == null || memberId == null || player1Id == null) return;

        GameState gameState = gameStateService.getGame(roomId);
        if (gameState == null) return;

        synchronized (gameState) {
            if (gameState.getStatus() != GameStatus.WAITING_SWAP) return;
            // 현재 턴 플레이어만 허용
            if (!Objects.equals(memberId, gameState.getCurrentPlayerId())) return;

            GamePlayerState player = gameState.getPlayers().get(memberId);
            if (player == null) return;

            // 기존 swapData 읽기
            SwapData swapData = parseSwapData(player.getActionDataStr());

            // player2와 같은 사람 선택 방지
            if (player1Id.equals(swapData.getPlayer2Id())) {
                return;
            }

            // player1Id 저장 + 룰렛 시작 시간 초기화
            swapData.setPlayer1Id(player1Id);
            swapData.setPlayer1StartAt(null); // 선택 완료되면 시작 시간 필요 없음

            // 저장
            player.setActionDataStr(toJson(swapData));

            // uiStep을 1로 변경 (SelectCategory로 돌아감)
            player.setUiStep(1);

            // 3개 다 선택됐으면 결과 적용
            if (swapData.isAllSelected()) {
                applyResult(gameState, player, swapData);
            }
        }
    }

    @Override
    public void confirmPlayer2(Long roomId, Long memberId, Long player2Id) {
        if (roomId == null || memberId == null || player2Id == null) return;

        GameState gameState = gameStateService.getGame(roomId);
        if (gameState == null) return;

        synchronized (gameState) {
            if (gameState.getStatus() != GameStatus.WAITING_SWAP) return;
            if (!Objects.equals(memberId, gameState.getCurrentPlayerId())) return;

            GamePlayerState player = gameState.getPlayers().get(memberId);
            if (player == null) return;

            SwapData swapData = parseSwapData(player.getActionDataStr());

            // player1과 같은 사람 선택 방지
            if (player2Id.equals(swapData.getPlayer1Id())) {
                return;
            }

            swapData.setPlayer2Id(player2Id);
            swapData.setPlayer2StartAt(null);

            player.setActionDataStr(toJson(swapData));
            player.setUiStep(1);

            if (swapData.isAllSelected()) {
                applyResult(gameState, player, swapData);
            }
        }
    }

    @Override
    public void confirmArrow(Long roomId, Long memberId, String category, String direction) {
        if (roomId == null || memberId == null || category == null || direction == null) return;

        GameState gameState = gameStateService.getGame(roomId);
        if (gameState == null) return;

        synchronized (gameState) {
            if (gameState.getStatus() != GameStatus.WAITING_SWAP) return;
            if (!Objects.equals(memberId, gameState.getCurrentPlayerId())) return;

            GamePlayerState player = gameState.getPlayers().get(memberId);
            if (player == null) return;

            SwapData swapData = parseSwapData(player.getActionDataStr());

            swapData.setCategory(category);
            swapData.setDirection(direction);
            swapData.setArrowStartAt(null);

            player.setActionDataStr(toJson(swapData));
            player.setUiStep(1);

            if (swapData.isAllSelected()) {
                applyResult(gameState, player, swapData);
            }
        }
    }

    @Override
    public void startPlayer1Roulette(Long roomId, Long memberId) {
        if (roomId == null || memberId == null) return;

        GameState gameState = gameStateService.getGame(roomId);
        if (gameState == null) return;

        synchronized (gameState) {
            if (gameState.getStatus() != GameStatus.WAITING_SWAP) return;
            if (!Objects.equals(memberId, gameState.getCurrentPlayerId())) return;

            GamePlayerState player = gameState.getPlayers().get(memberId);
            if (player == null) return;

            SwapData swapData = parseSwapData(player.getActionDataStr());
            swapData.setPlayer1CycleMs(PLAYER_CYCLE_MS);
            swapData.setPlayer1StartAt(System.currentTimeMillis());

            player.setActionDataStr(toJson(swapData));
            player.setUiStep(2);  // SelectFirstPlayer
        }
    }

    @Override
    public void startPlayer2Roulette(Long roomId, Long memberId) {
        if (roomId == null || memberId == null) return;

        GameState gameState = gameStateService.getGame(roomId);
        if (gameState == null) return;

        synchronized (gameState) {
            if (gameState.getStatus() != GameStatus.WAITING_SWAP) return;
            if (!Objects.equals(memberId, gameState.getCurrentPlayerId())) return;

            GamePlayerState player = gameState.getPlayers().get(memberId);
            if (player == null) return;

            SwapData swapData = parseSwapData(player.getActionDataStr());
            swapData.setPlayer2CycleMs(PLAYER_CYCLE_MS);
            swapData.setPlayer2StartAt(System.currentTimeMillis());

            player.setActionDataStr(toJson(swapData));
            player.setUiStep(3);  // SelectSecondPlayer
        }
    }

    @Override
    public void startArrowRoulette(Long roomId, Long memberId) {
        if (roomId == null || memberId == null) return;

        GameState gameState = gameStateService.getGame(roomId);
        if (gameState == null) return;

        synchronized (gameState) {
            if (gameState.getStatus() != GameStatus.WAITING_SWAP) return;
            if (!Objects.equals(memberId, gameState.getCurrentPlayerId())) return;

            GamePlayerState player = gameState.getPlayers().get(memberId);
            if (player == null) return;

            SwapData swapData = parseSwapData(player.getActionDataStr());
            swapData.setArrowCycleMs(ARROW_CYCLE_MS);
            swapData.setArrowStartAt(System.currentTimeMillis());

            player.setActionDataStr(toJson(swapData));
            player.setUiStep(4);  // SelectArrow
        }
    }

    private void applyResult(GameState gameState, GamePlayerState currentPlayer, SwapData swapData) {
        GamePlayerState player1 = gameState.getPlayers().get(swapData.getPlayer1Id());
        GamePlayerState player2 = gameState.getPlayers().get(swapData.getPlayer2Id());

        if (player1 == null || player2 == null) {
            currentPlayer.setActionDataStr(toJson(swapData));
            currentPlayer.setUiStep(5);
            return;
        }

        String category = swapData.getCategory();
        String direction = swapData.getDirection();

        switch (category) {
            case "HOUSE":
                swapHouse(player1, player2, swapData);
                break;
            case "BELL":
                swapBell(player1, player2, direction, swapData);
                break;
            case "RESOURCE":
                swapResource(player1, player2, direction, swapData);
                break;
            case "LOAN":
                swapLoan(player1, player2, direction, swapData);
                break;
        }

        currentPlayer.setActionDataStr(toJson(swapData));
        currentPlayer.setUiStep(5); // 결과 페이지로 이동
    }

    // 벨, 대출 100~500 사이 랜덤 (10 단위)
    private int randomAmount() {
        return ThreadLocalRandom.current().nextInt(10, 51) * 10;  // 100~500
    }

    // 집 교환
    private void swapHouse(GamePlayerState p1, GamePlayerState p2, SwapData swapData) {
        var temp = p1.getHouseLevel();
        p1.setHouseLevel(p2.getHouseLevel());
        p2.setHouseLevel(temp);
    }

    // 벨 스왑
    private void swapBell(GamePlayerState p1, GamePlayerState p2, String direction, SwapData swapData) {
        switch (direction) {
            case "TO_RIGHT": {
                int amount = randomAmount();
                int have = p1.getBell();
                if (have >= amount) {
                    p1.setBell(have - amount);
                } else {
                    int shortage = amount - have;
                    p1.setBell(0);
                    p1.setLoan(p1.getLoan() + shortage);
                    swapData.setResultLoanAdded(shortage);
                }
                p2.setBell(p2.getBell() + amount);
                swapData.setResultAmount(amount);
                break;
            }
            case "TO_LEFT": {
                int amount = randomAmount();
                int have = p2.getBell();
                if (have >= amount) {
                    p2.setBell(have - amount);
                } else {
                    int shortage = amount - have;
                    p2.setBell(0);
                    p2.setLoan(p2.getLoan() + shortage);
                    swapData.setResultLoanAdded(shortage);
                }
                p1.setBell(p1.getBell() + amount);
                swapData.setResultAmount(amount);
                break;
            }
            case "EXCHANGE": {
                int temp = p1.getBell();
                p1.setBell(p2.getBell());
                p2.setBell(temp);
                break;
            }
        }
    }

    // 재화 스왑
    private void swapResource(GamePlayerState p1, GamePlayerState p2, String direction, SwapData swapData) {
        switch (direction) {
            case "TO_RIGHT": {
                int moved = transferRandomResources(p1, p2);
                swapData.setResultCount(moved);
                break;
            }
            case "TO_LEFT": {
                int moved = transferRandomResources(p2, p1);
                swapData.setResultCount(moved);
                break;
            }
            case "EXCHANGE": {
                // 1. P1의 데이터를 백업 (타입 명시)
                var tempRes = copyMap(p1.getResources(), ResourceType.class);
                var tempHar = copyMap(p1.getHarvests(), HarvestType.class);

                // 2. P1에 P2 데이터 주입
                p1.setResources(copyMap(p2.getResources(), ResourceType.class));
                p1.setHarvests(copyMap(p2.getHarvests(), HarvestType.class));

                // 3. P2에 백업해둔 P1 데이터 주입
                p2.setResources(tempRes);
                p2.setHarvests(tempHar);
                break;
            }
        }
    }

    // 대출 스왑
    private void swapLoan(GamePlayerState p1, GamePlayerState p2, String direction, SwapData swapData) {
        switch (direction) {
            case "TO_RIGHT": {
                int amount = randomAmount();
                int actual = Math.min(amount, p1.getLoan());
                p1.setLoan(p1.getLoan() - actual);
                p2.setLoan(p2.getLoan() + actual);
                swapData.setResultAmount(actual);
                break;
            }
            case "TO_LEFT": {
                int amount = randomAmount();
                int actual = Math.min(amount, p2.getLoan());
                p2.setLoan(p2.getLoan() - actual);
                p1.setLoan(p1.getLoan() + actual);
                swapData.setResultAmount(actual);
                break;
            }
            case "EXCHANGE": {
                int temp = p1.getLoan();
                p1.setLoan(p2.getLoan());
                p2.setLoan(temp);
                break;
            }
        }
    }

    // 랜덤 1~5개 재화 이동 (from → to)
    private int transferRandomResources(GamePlayerState from, GamePlayerState to) {
        int want = ThreadLocalRandom.current().nextInt(1, 6);  // 1~5
        int moved = 0;

        // Resource 이동
        if (from.getResources() != null && !from.getResources().isEmpty()) {
            if (to.getResources() == null) {
                to.setResources(new EnumMap<>(ResourceType.class));
            }

            List<ResourceType> available = new ArrayList<>();
            for (var entry : from.getResources().entrySet()) {
                if (entry.getValue() > 0) {
                    available.add(entry.getKey());
                }
            }

            Collections.shuffle(available);

            for (ResourceType type : available) {
                if (moved >= want) break;

                int have = from.getResources().get(type);
                int take = Math.min(want - moved, have);

                from.getResources().put(type, have - take);
                to.getResources().merge(type, take, Integer::sum);
                moved += take;
            }
        }

        // Harvest 이동 (Resource로 부족하면)
        if (moved < want && from.getHarvests() != null && !from.getHarvests().isEmpty()) {
            if (to.getHarvests() == null) {
                to.setHarvests(new EnumMap<>(HarvestType.class));
            }

            List<HarvestType> available = new ArrayList<>();
            for (var entry : from.getHarvests().entrySet()) {
                if (entry.getValue() > 0) {
                    available.add(entry.getKey());
                }
            }

            Collections.shuffle(available);

            for (HarvestType type : available) {
                if (moved >= want) break;

                int have = from.getHarvests().get(type);
                int take = Math.min(want - moved, have);

                from.getHarvests().put(type, have - take);
                to.getHarvests().merge(type, take, Integer::sum);
                moved += take;
            }
        }

        return moved;
    }

    // Map 복사 (null-safe)
    @SuppressWarnings("unchecked")
    // Enum 타입을 인자로 받아 null이어도 빈 맵을 생성하도록 수정
    private <K extends Enum<K>, V> EnumMap<K, V> copyMap(Map<K, V> original, Class<K> keyType) {
        if (original == null || original.isEmpty()) {
            return new EnumMap<>(keyType);
        }
        return new EnumMap<>(original);
    }
}
