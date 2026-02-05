package com.buildmyhome.game.controller;

import static com.buildmyhome.game.constants.GameConstants.*;

import com.buildmyhome.fishing.dto.FishingActionRequest;
import com.buildmyhome.fishing.dto.StartFishingRequest;
import com.buildmyhome.fishing.service.FishingService;
import com.buildmyhome.game.constants.BoardData;
import com.buildmyhome.game.dto.*;
import com.buildmyhome.game.service.GameStateService;
import com.buildmyhome.game.service.MoveService;
import com.buildmyhome.house.service.HouseService;
import com.buildmyhome.item.service.ItemService;
import com.buildmyhome.kk.KKService;
import com.buildmyhome.loan.service.LoanService;
import com.buildmyhome.machurilla.service.MachurillaService;
import com.buildmyhome.mupani.service.MupaniService;
import com.buildmyhome.reward.service.RewardService;
import com.buildmyhome.room.dto.RoomPlayerState;
import com.buildmyhome.room.dto.RoomState;
import com.buildmyhome.room.service.RoomStateService;
import com.buildmyhome.roomlist.service.RoomListService;
import com.buildmyhome.shop.service.ShopService;
import com.buildmyhome.stamp.service.StampService;
import com.buildmyhome.swap.service.SwapService;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.*;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

@Controller
@RequiredArgsConstructor
public class GameWsController {

    private final SimpMessagingTemplate simpMessagingTemplate;
    private final RoomStateService roomStateService;
    private final GameStateService gameStateService;
    private final ShopService shopService;
    private final LoanService loanService;
    private final StampService stampService;
    private final KKService kkService;
    private final HouseService houseService;
    private final FishingService fishingService;
    private final MupaniService mupaniService;
    private final MoveService moveService;
    private final RewardService rewardService;
    private final MachurillaService machurillaService;
    private final SwapService swapService;
    private final ItemService itemService;
    private final RoomListService roomListService;
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);

    // TODO: 추후 GameEventService로 분리 - Tiffany
    // 타임아웃 됐을 때 자동으로 턴이 넘어가는 칸이 아닐 경우 여기서 처리
    // ex) 타임아웃 됐을 경우 KK는 입장료를 반드시 납부하고, 공연을 관람하게 해야함
    private void handleEventTimeout(GameState gameState, GameStatus status, Long roomId) {
        if (gameState.getStatus() != status) return;
        gameState.clearCurrentTimeout();
        GamePlayerState player = gameState.getPlayers().get(gameState.getCurrentPlayerId());
        GameMessage response;

        switch (status) {
            case WAITING_KK:
                if (player.getUiStep() >= 2) return; // 유저가 이미 액션을 취함 -> timeout 무시 (방어 코드)
                kkService.payEntryFee(player, 0); // 타임아웃 됐을 경우 랜덤 선택

                player.setUiStep(2); // 화면 전환

                response = defaultGameResponse("KK_AUTO_START", gameState);
                response.setActionData(player.getActionData());
                break;
            case WAITING_MUPANI:
                mupaniService.onTimeout(roomId, gameState);
                return;
            case WAITING_START:
                if (player.getRemainingMoves() > 0) {
                    int remaining = player.getRemainingMoves();
                    moveService.movePlayer(player, remaining);
                    gameState.setStatus(GameStatus.MOVING);

                    response = defaultGameResponse("CONTINUE_MOVING", gameState);
                } else {
                    // 남은 거리가 없다면
                    gameStateService.turnToNextPlayer(roomId);
                    response = defaultGameResponse("EVENT_TIMEOUT", gameState);
                }
                break;
            case WAITING_MACHURILLA:
                if (player.getUiStep() >= 4) return;
                machurillaService.applyCardEffect(gameState, player);
                player.setUiStep(6); // result-3으로 강제 이동
                response = defaultGameResponse("MACHURILLA_AUTO_SELECT", gameState);
                break;
            // 기본은 다음 턴으로 넘어감
            default:
                gameStateService.turnToNextPlayer(roomId);
                response = defaultGameResponse("EVENT_TIMEOUT", gameState);
                break;

        }

        simpMessagingTemplate.convertAndSend("/topic/games/" + roomId, response);
    }
    private void refreshHouseInfos(GameState gameState) {
        if (gameState == null || gameState.getPlayers() == null) return;

        for (GamePlayerState p : gameState.getPlayers().values()) {
            if (p == null) continue;
            houseService.updateHouseInfo(p); // canUpgradeHouse/nextHouseLevel/requiredResources 최신화
        }
    }

    // 서버메모리 -> 프론트로 전달하는 공통 응답 DTO 생성하는 메서드
    private GameMessage defaultGameResponse(String type, GameState gameState) {
        refreshHouseInfos(gameState);
        GameMessage response = new GameMessage();
        response.setType(type);
        response.setCurrentPlayerId(gameState.getCurrentPlayerId());
        response.setStatus(gameState.getStatus().name());
        response.setPlayers(new ArrayList<>(gameState.getPlayers().values()));
        response.setTurnOrder(gameState.getTurnOrder());
        response.setCurrentRound(gameState.getCurrentRound());
        response.setTotalRounds(gameState.getTotalRounds());
        response.setRadishPrice(gameState.getRadishPrice()); // 무 시세 항상 포함

        // 타임아웃 계산 로직 (경과 시간 반영)
        int definitionTimeout = gameState.getStatus().getTimeoutSeconds();
        if (definitionTimeout > 0 && gameState.getStatusUpdatedAt() != null) {
            long elapsedSeconds = java.time.Duration.between(
                    gameState.getStatusUpdatedAt(),
                    java.time.LocalDateTime.now()
            ).toSeconds();
            int remainingSeconds = Math.max(0, definitionTimeout - (int) elapsedSeconds);
            response.setTimeoutSeconds(remainingSeconds);
        } else {
            response.setTimeoutSeconds(definitionTimeout);
        }
        return response;
    }

    // 무파니/무판매 공통: TradeResult를 GameMessage 응답에 반영
    private void applyTradeResult(GameMessage response, Long memberId, MupaniService.TradeResult tr) {
        response.setType(tr.type());
        response.setMemberId(memberId);
        response.setQuantity(tr.quantity());
        response.setAmount(tr.amount());
        response.setRadishPrice(tr.price());
    }

    @MessageMapping("/games/get-state")
    public void getGameState(GameMessage message) {
        Long roomId = message.getRoomId();
        GameState gameState = gameStateService.getGame(roomId);
        if (gameState == null) return;

        GameMessage response = defaultGameResponse("CURRENT_GAME_STATE", gameState);
        simpMessagingTemplate.convertAndSend("/topic/games/" + roomId, response);
    }

    @MessageMapping("/games/start")
    public void startGame(GameMessage message) {
        Long roomId = message.getRoomId();
        RoomState room = roomStateService.getRoom(roomId);

        // 모든 플레이어가 준비 완료 상태인지 확인 (카운트다운 중 준비 해제 시 게임 시작 방지)
        if (!room.isAllReady()) {
            return; // 준비 안 된 플레이어가 있으면 게임 시작 X
        }

        // DB 상태를 PLAYING으로 변경 (중도 입장 방지)
        roomListService.startGame(roomId);

        // 방 상태(Ready, Timer) 초기화
        roomStateService.resetReadyStatus(roomId);

        GameState gameState = new GameState(roomId);
        gameState.setStatus(GameStatus.INTRO);
        gameState.setTotalRounds(room.getTotalRounds());

        for (RoomPlayerState player : room.getPlayers().values()) {
        // Todo: 테스트용입니다!!! 지울 것!!!!
            GamePlayerState gps = new GamePlayerState(
                    player.getMemberId(),
                    player.getNickname(),
                    player.getCharacterId()
            );
            // 모든 자원 10개씩
            for (ResourceType t : ResourceType.values()) {
                gps.getResources().put(t, 10);
            }

            // 모든 수확물 1개씩
            for (HarvestType h : HarvestType.values()) {
                gps.getHarvests().put(h, 10);
            }

            gameState.addPlayer(gps);
        }
        gameStateService.saveGame(roomId, gameState);

        GameMessage response = defaultGameResponse("GAME_START", gameState);
        simpMessagingTemplate.convertAndSend("/topic/rooms/" + roomId, response);
    }

    @MessageMapping("/games/intro-complete")
    public void introComplete(GameMessage message) {
        Long roomId = message.getRoomId();
        GameState gameState = gameStateService.getGame(roomId);
        if (gameState == null) return;
        gameState.setStatus(GameStatus.DETERMINING_ORDER);

        GameMessage response = defaultGameResponse("INTRO_COMPLETE", gameState);
        simpMessagingTemplate.convertAndSend("/topic/games/" + roomId, response);
    }

    @MessageMapping("/games/roll-order")
    public void rollForOrder(GameMessage message, Principal principal) {
        Long roomId = message.getRoomId();
        Long memberId = Long.parseLong(principal.getName());
        GameState gameState = gameStateService.getGame(roomId);

        synchronized (gameState) {
            GamePlayerState player = gameState.getPlayers().get(memberId);
            // 플레이어가 없거나 이미 주사위 굴렸으면 종료
            if (player == null || player.getOrderDiceValue() != null) return;

            // 남은 숫자 중에서 랜덤으로 하나 뽑기 (뽑고 available에서 제거)
            List<Integer> available = gameState.getAvailableDiceNumbers();
            int diceValue = available.remove((int) (Math.random() * available.size()));
            player.setOrderDiceValue(diceValue); // 플레이어 순서용 주사위 값 설정

            // 모든 인원이 다 뽑았는지 체크
            boolean allDone = gameState
                    .getPlayers()
                    .values()
                    .stream()
                    .allMatch((p) -> p.getOrderDiceValue() != null);

            if (allDone) {
                // 높은 숫자 순으로 정렬해서 turnOrder 생성
                List<Long> sortedTurnOrder = gameState
                        .getPlayers()
                        .values()
                        .stream()
                        .sorted(Comparator.comparing(GamePlayerState::getOrderDiceValue).reversed())
                        .map(GamePlayerState::getMemberId)
                        .toList();

                gameState.setTurnOrder(sortedTurnOrder);
                gameState.setCurrentPlayerId(sortedTurnOrder.get(0));
                gameState.setStatus(GameStatus.WAITING_PLAYER_ACTION); // 서버 상태 변경
            }

            GameMessage response = defaultGameResponse(allDone ? "ALL_DICE_ROLLED" : "DICE_ROLLED", gameState);
            simpMessagingTemplate.convertAndSend("/topic/games/" + roomId, response);
        }
    }

    @MessageMapping("/games/select-dice")
    public void selectDice(GameMessage message, Principal principal) {
        Long roomId = message.getRoomId();
        Long memberId = Long.parseLong(principal.getName());
        GameState gameState = gameStateService.getGame(roomId);

        if (gameState == null) return;

        synchronized (gameState) {
            if (!memberId.equals(gameState.getCurrentPlayerId()) ||
                    gameState.getStatus() != GameStatus.WAITING_PLAYER_ACTION) {
                // 잘못된 턴이거나 상태일 경우 에러 메시지 전송 로직 추가 가능
                return;
            }

            GamePlayerState player = gameState.getPlayers().get(memberId);
            if (player == null) return;

            // 건강운 하락(스킵) 체크
            if (player.getSkipNextTurnCount() > 0) {
                player.setSkipNextTurnCount(player.getSkipNextTurnCount() - 1);
                gameState.setStatus(GameStatus.PLAYER_SKIPPED);

                // 프론트에 스킵 알림 전송
                GameMessage skipResponse = defaultGameResponse("PLAYER_SKIPPED", gameState);
                simpMessagingTemplate.convertAndSend("/topic/games/" + roomId, skipResponse);

                return;
            }

            gameState.setStatus(GameStatus.WAITING_DICE);
            simpMessagingTemplate.convertAndSend("/topic/games/" + roomId, defaultGameResponse("DICE_SELECTED", gameState));
        }
    }

    @MessageMapping("/games/roll-dice")
    public void rollDice(GameMessage message, Principal principal) {
        Long roomId = message.getRoomId();
        Long memberId = Long.parseLong(principal.getName());
        GameState gameState = gameStateService.getGame(roomId);

        if (gameState == null) return;

        synchronized (gameState) {
            if (!memberId.equals(gameState.getCurrentPlayerId()) || gameState.getStatus() != GameStatus.WAITING_DICE) {
                // 잘못된 턴이거나 상태일 경우 에러 메시지 전송 로직 추가 가능
                return;
            }

            GamePlayerState player = gameState.getPlayers().get(memberId);
            if (player == null) return;

            // 서버에서 주사위 값 생성
            int diceValue = (int) (Math.random() * DICE_MAX) + DICE_MIN;
            player.setDiceValue(diceValue);

            // 플레이어 이동 처리 (위치 계산만, 아직 이동 X)
            moveService.movePlayer(player, diceValue);
            gameState.setStatus(GameStatus.ROLLING_DICE);

            GameMessage response = defaultGameResponse("DICE_ROLLING", gameState);
            response.setDiceValue(diceValue); // 플레이어 주사위 값 전달
            simpMessagingTemplate.convertAndSend("/topic/games/" + roomId, response);
        }
    }

    @MessageMapping("/games/dice-roll-complete")
    public void diceComplete(GameMessage message, Principal principal) {
        Long roomId = message.getRoomId();
        Long memberId = Long.parseLong(principal.getName());
        GameState gameState = gameStateService.getGame(roomId);

        if (gameState == null) return;

        synchronized (gameState) {
            if (!memberId.equals(gameState.getCurrentPlayerId()) || gameState.getStatus() != GameStatus.ROLLING_DICE) {
                return;
            }

            GamePlayerState player = gameState.getPlayers().get(memberId);
            if (player == null) return;
            // MOVING 상태로 변경
            gameState.setStatus(GameStatus.MOVING);

            GameMessage response = defaultGameResponse("DICE_ROLLED", gameState);
            response.setMovePath(player.getMovePath());
            simpMessagingTemplate.convertAndSend("/topic/games/" + roomId, response);
        }
    }

    @MessageMapping("/games/move-complete")
    public void moveComplete(GameMessage message, Principal principal) {
        Long roomId = message.getRoomId();
        Long memberId = Long.parseLong(principal.getName());
        GameState gameState = gameStateService.getGame(roomId);

        if (gameState == null) return;

        synchronized (gameState) {
            if (!memberId.equals(gameState.getCurrentPlayerId()) || gameState.getStatus() != GameStatus.MOVING) {
                return;
            }

            GamePlayerState player = gameState.getPlayers().get(memberId);
            if (player == null) return;

            List<Integer> path = player.getMovePath();
            if (path != null && !path.isEmpty()) {
                player.setPosition(path.get(path.size() - 1));
            }
            player.setMovePath(null);

            // 플레이어가 도착한 칸에 맞는 상태로 전환 (예: KK 칸이면 WAITING_KK)
            GameStatus nextStatus = BoardData.getNextStatus(player.getPosition());
            gameState.setStatus(nextStatus);

            // 무파니 세션 시작(방 전체 구매 이벤트)
            if (nextStatus == GameStatus.WAITING_MUPANI) {
                mupaniService.startSession(roomId, gameState);
            }

            rewardService.prepareReward(nextStatus, player);

            if (nextStatus == GameStatus.WAITING_SHOP) {
                shopService.startShopSession(roomId, memberId);
                System.out.println("🏪 아이템 상점 세션 생성: memberId=" + memberId);
            }

            // 도착한 칸이 타임아웃이 설정된 상태라면 스케줄러로 타임아웃 등록
            if (nextStatus.isAutoProceed()) {
                // 방어 코드
                gameState.clearCurrentTimeout();

                // 스케줄러 등록
                ScheduledFuture<?> future = scheduler.schedule(
                        () -> {
                            synchronized (gameState) {
                                if (gameState.getStatus() == nextStatus) {  // 방어 로직
                                    handleEventTimeout(gameState, nextStatus, roomId);
                                }
                            }
                        },
                        nextStatus.getTimeoutSeconds(),
                        TimeUnit.SECONDS
                );

                gameState.setCurrentTimeout(future);
            }


            GameMessage response = defaultGameResponse("MOVE_COMPLETE", gameState);
            simpMessagingTemplate.convertAndSend("/topic/games/" + roomId, response);
        }
    }

    @MessageMapping("/games/action")
    public void handleGameAction(GameMessage message, Principal principal) {
        Long roomId = message.getRoomId();
        String actionType = message.getType(); // 프론트에서 보낸 "LOAN_ACTION", "STAMP_ACTION" 등

        GameState gameState = gameStateService.getGame(roomId);
        if (gameState == null) return;

        // TODO: 서비스 로직 분리 고려 GameActionService 등 - Tiffany
        synchronized (gameState) {
            // 1. 공통 검증 (현재 턴인지 등)
            Long memberId = Long.parseLong(principal.getName());

            // 무파니칸은 모두 액션 가능 (BUY/SKIP)
            boolean allowAnyPlayerAction =
                    gameState.getStatus() == GameStatus.WAITING_MUPANI &&
                            ("RADISH_BUY".equals(actionType) || "RADISH_SKIP".equals(actionType));

            if (!allowAnyPlayerAction && !memberId.equals(gameState.getCurrentPlayerId())) return;

            GamePlayerState player = gameState.getPlayers().get(memberId);

            try {
                GameMessage response = defaultGameResponse("ACTION_PROCESSED", gameState);
                boolean endMupaniAfterSend = false;

                // 2. 타입에 따라 분기 처리
                switch (actionType) {
                    case "LOAN_BORROW":
                        loanService.borrow(roomId, memberId, message.getAmount(), message.isBankTile());
                        response.setType("LOAN_BORROWED");
                        break;
                    case "LOAN_REPAY":
                        loanService.repay(roomId, memberId, message.getAmount());
                        response.setType("LOAN_REPAID");
                        break;
                    case "STAMP_COLLECT":
                        boolean canCollectStamp = stampService.collectStamp(player, message.getActionDataStr());
                        player.setUiStep(2);
                        response.setType(canCollectStamp ? "STAMP_ADDED" : "STAMP_DUPLICATE");
                        break;
                    case "SHOP_INTRO_DONE":
                        shopService.updateIntroShown(roomId);
                        response.setType("SHOP_INTRO_DONE");
                        break;
                    case "SHOP_TAB_CHANGE":
                        shopService.updateIntroShown(roomId);
                        player.setUiStep(message.getUiStep());
                        response.setType("SHOP_TAB_CHANGED");
                        break;
                    case "SHOP_SELECT":
                        shopService.updateIntroShown(roomId);
                        // relay는 현재 턴 플레이어가 아이템 선택했을 때, 그 정보를 다른 플레이어들에게 전달하는 메시지
                        GameMessage relay = shopService.relayMessage(roomId, memberId, message);
                        response = relay;
                        break;
                    case "SHOP_SELECT_CLEAR":
                        response.setType("SHOP_SELECT_CLEAR");
                        break;
                    case "SHOP_BUY_ITEM":
                        shopService.buyItem(roomId, memberId, message.getShopItemType());
                        break;
                    case "SHOP_BUY_RESOURCE":
                        shopService.buyResource(roomId, memberId, message.getResourceType(), message.getQuantity());
                        break;
                    case "SHOP_SELL_RESOURCE":
                        shopService.sellResource(roomId, memberId, message.getResourceType(), message.getQuantity());
                        break;
                    case "SHOP_SELL_HARVEST":
                        shopService.sellHarvest(roomId, memberId, message.getHarvestType(), message.getQuantity());
                        break;
                    case "KK_ACTION":
                        int songId = (message.getActionData() != null) ? message.getActionData() : 0;
                        kkService.payEntryFee(player, songId);
                        player.setUiStep(2);
                        response.setType("KK_FEE_PAID");
                        break;
                    case "SWAP_START_PLAYER1_ROULETTE":
                        swapService.startPlayer1Roulette(roomId, memberId);
                        response.setType("SWAP_PLAYER1_ROULETTE_STARTED");
                        break;
                    case "SWAP_START_PLAYER2_ROULETTE":
                        swapService.startPlayer2Roulette(roomId, memberId);
                        response.setType("SWAP_PLAYER2_ROULETTE_STARTED");
                        break;
                    case "SWAP_START_ARROW_ROULETTE":
                        swapService.startArrowRoulette(roomId, memberId);
                        response.setType("SWAP_ARROW_ROULETTE_STARTED");
                        break;
                    case "SWAP_PLAYER1_CONFIRM":
                        swapService.confirmPlayer1(roomId, memberId, message.getPlayer1Id());
                        response.setType("SWAP_PLAYER1_CONFIRMED");
                        break;
                    case "SWAP_PLAYER2_CONFIRM":
                        swapService.confirmPlayer2(roomId, memberId, message.getPlayer2Id());
                        response.setType("SWAP_PLAYER2_CONFIRMED");
                        break;
                    case "SWAP_ARROW_CONFIRM":
                        swapService.confirmArrow(roomId, memberId, message.getCategory(), message.getDirection());
                        response.setType("SWAP_ARROW_CONFIRMED");
                        break;
                    case "REWARD_CONFIRM": {
                        if (gameState.getStatus() == GameStatus.WAITING_RESOURCES
                                || gameState.getStatus() == GameStatus.WAITING_HARVEST) {
                            player.setUiStep(1);
                            response.setType("REWARD_CONFIRMED");
                        }
                        break;
                    }
                    case "REWARD_NEXT": {
                        if (gameState.getStatus() == GameStatus.WAITING_RESOURCES
                                || gameState.getStatus() == GameStatus.WAITING_HARVEST) {
                            player.setUiStep(1);
                            response.setType("REWARD_NEXT");
                        }
                        break;
                    }

                    case "BUILD_HOUSE":
                        player.setUiStep(0);
                        houseService.updateHouseInfo(player);
                        gameState.setStatus(GameStatus.WAITING_HOUSE);
                        response.setType("BUILD_HOUSE_START");
                        break;
                    case "UPGRADE_HOUSE":
                        houseService.upgradeHouse(player);
                        player.setUiStep(4);
                        response.setType("HOUSE_UPGRADED");
                        break;
                    case "OPEN_RADISH_SELL":
                        gameState.setStatus(GameStatus.WAITING_RADISH_SELL);
                        player.setUiStep(0);
                        player.setActionData(0);
                        response.setType("RADISH_SELL_OPENED");
                        break;
                    case "RADISH_SELL": {
                        if (gameState.getStatus() != GameStatus.WAITING_RADISH_SELL) {
                            response.setType("RADISH_SELL_INVALID_STATUS");
                            break;
                        }
                        int qty = Math.max(1, message.getQuantity());
                        MupaniService.TradeResult tr = mupaniService.sell(gameState, memberId, qty);
                        applyTradeResult(response, memberId, tr);
                        if ("RADISH_SOLD".equals(tr.type())) {
                            player.setUiStep(2);
                        }
                        response.setPlayers(new ArrayList<>(gameState.getPlayers().values()));
                        break;
                    }
                    case "RADISH_BUY": {
                        int qty = Math.max(1, message.getQuantity());
                        MupaniService.MupaniActionResult ar = mupaniService.buy(roomId, gameState, memberId, qty);
                        applyTradeResult(response, memberId, ar.trade());
                        response.setPlayers(new ArrayList<>(gameState.getPlayers().values()));
                        break;
                    }
                    case "RADISH_SKIP": {
                        MupaniService.MupaniActionResult ar = mupaniService.skip(roomId, gameState, memberId);
                        applyTradeResult(response, memberId, ar.trade());
                        response.setPlayers(new ArrayList<>(gameState.getPlayers().values()));
                        break;
                    }
                    case "OPEN_ATM":
                        response.setType("ATM_OPENED");
                        response.setMemberId(memberId);
                        break;
                    case "CLOSE_ATM":
                        response.setType("ATM_CLOSED");
                        response.setMemberId(memberId);
                        break;
                    case "CLOSE_ACTION":
                        gameState.clearCurrentTimeout();
                        player.setUiStep(0); // UI 스텝 초기화
                        player.setActionDataStr(null); // 이전 이벤트 연출 데이터 정리(잔상 방지)
                        gameState.setStatus(GameStatus.WAITING_PLAYER_ACTION);
                        response.setType("ACTION_CLOSED");
                        break;
                    case "SET_STEP":
                        player.setUiStep(message.getUiStep()); // 특정 값으로 설정
                        response.setType("STEP_CHANGED");
                        break;
                    case "START_STAMP_EXCHANGE":
                        int reward = stampService.exchangeStamps(player);
                        player.setUiStep(1);
                        player.setActionData(reward);
                        response.setType("START_STAMP_EXCHANGED");
                        break;
                    case "START_STAMP_SKIP":
                        player.setUiStep(2);
                        response.setType("START_STAMP_SKIPPED");
                        break;
                    case "MACHURILLA_SELECT":
                        machurillaService.applyCardEffect(gameState, player);
                        player.setUiStep(3);
                        response.setType("MACHURILLA_SELECTED");
                        break;
                    case "OPEN_INVENTORY":
                        response.setType("INVENTORY_OPENED");
                        response.setMemberId(memberId);
                        break;
                    case "CLOSE_INVENTORY":
                        response.setType("INVENTORY_CLOSED");
                        response.setMemberId(memberId);
                        break;
                    case "GET_RANDOM_ITEM": {
                        ItemType item = itemService.getRandomItem(player);
                        player.setActionDataStr(item.name());
                        gameState.setStatus(GameStatus.WAITING_ITEMS);
                        boolean invFull = player.getItems() != null && player.getItems().size() >= 3;
                        if (!invFull) {
                            itemService.addItem(player, item);
                            player.setUiStep(3);
                        } else {
                            player.setUiStep(1);
                        }
                        response.setType("RANDOM_ITEM_SELECTED");
                        break;
                    }
                    case "HANDLE_INVENTORY_FULL": {
                        int selectedIdx = message.getActionData();
                        boolean invFull = player.getItems() != null && player.getItems().size() >= 3;
                        if (!invFull) return;
                        if (selectedIdx < 3) {
                            ItemType dropItem = player.getItems().get(selectedIdx);
                            ItemType newItem = ItemType.valueOf(player.getActionDataStr());
                            itemService.swapItem(player, dropItem, newItem);
                        } else {
                            player.setActionDataStr(null);
                        }
                        player.setUiStep(3);
                        response.setType("INVENTORY_HANDLED");
                        break;
                    }
                    case "SELECT_ITEM_TO_DROP": {
                        player.setActionData(message.getActionData());
                        response.setType("ITEM_DROP_SELECTED");
                        break;
                    }
                    case "OPEN_ITEM_INVENTORY":
                        gameState.setStatus(GameStatus.WAITING_USING_ITEM);
                        response.setType("ITEM_INVENTORY_OPENED");
                        break;
                    case "SELECT_ITEM_TO_USE":
                        player.setActionData(message.getActionData());  // 선택한 인덱스
                        response.setType("ITEM_USE_SELECTED");
                        break;
                    case "CLOSE_ITEM_INVENTORY":
                        gameState.setStatus(GameStatus.WAITING_PLAYER_ACTION);
                        response.setType("ITEM_INVENTORY_CLOSED");
                        break;
                    case "USE_ITEM":
                        try {
                            String useItemType = message.getActionDataStr();
                            int useItemIdx = message.getActionData();
                            GameStatus nextStatus = itemService.useItem(gameState, player, useItemType, useItemIdx);
                            gameState.setStatus(nextStatus);
                            response.setType("ITEM_USED");
                        } catch (IllegalArgumentException e) {
                            response.setType("ITEM_USE_ERROR");
                            response.setErrorMessage(e.getMessage());
                        }
                        break;
                    case "PIPE_COMPLETE":
                        player.clearTurnData();
                        gameState.setStatus(GameStatus.WAITING_PLAYER_ACTION);
                        response.setType("PIPE_COMPLETED");
                        break;
                    case "MIRROR_COMPLETE":
                        player.clearTurnData();
                        gameState.setStatus(GameStatus.WAITING_PLAYER_ACTION);
                        response.setType("MIRROR_COMPLETED");
                        break;
                }

                // 상점 상태 인트로 관련 내용
                if (gameState.getStatus() == GameStatus.WAITING_SHOP) {
                    response.setShopSession(gameState.getShopSession());
                }

                response.setStatus(gameState.getStatus().name());
                response.setPlayers(new ArrayList<>(gameState.getPlayers().values()));
                simpMessagingTemplate.convertAndSend("/topic/games/" + roomId, response);
            } catch (Exception e) {
                // 에러 발생 시 에러 메시지 전송
                GameMessage errorResponse = defaultGameResponse("ACTION_ERROR", gameState);
                errorResponse.setErrorMessage(e.getMessage());
                simpMessagingTemplate.convertAndSend("/topic/games/" + roomId, errorResponse);
            }
        }
    }

    @MessageMapping("/games/event-complete")
    public void eventComplete(GameMessage message, Principal principal) {
        Long roomId = message.getRoomId();
        Long memberId = Long.parseLong(principal.getName());
        GameState gameState = gameStateService.getGame(roomId);
        if (gameState == null) return;

        synchronized (gameState) {
            gameState.clearCurrentTimeout();
            if (!memberId.equals(gameState.getCurrentPlayerId())) {
                return;
            }
            GamePlayerState player = gameState.getPlayers().get(memberId);

            // 1. 아직 이동이 남았는지 체크 (최우선 순위)
            if (player.getRemainingMoves() > 0) {
                int remainingMoves = player.getRemainingMoves();
                // 남은 이동 칸이 있으면 MOVING 상태로 복귀
                moveService.movePlayer(player, remainingMoves);
                gameState.setStatus(GameStatus.MOVING);
                GameMessage response = defaultGameResponse("CONTINUE_MOVING", gameState);
                simpMessagingTemplate.convertAndSend("/topic/games/" + roomId, response);
                return;
            }

            // 2. 건강운 상승(Extra Dice) 체크
            if (player.isExtraDice()) {
                player.setExtraDice(false); // 플래그 소모
                player.clearTurnData();
                gameState.setStatus(GameStatus.WAITING_DICE); // 상태를 다시 주사위 대기로

                GameMessage response = defaultGameResponse("EXTRA_DICE_START", gameState);
                simpMessagingTemplate.convertAndSend("/topic/games/" + roomId, response);
                return;
            }

            // 턴 증가
            gameStateService.turnToNextPlayer(roomId);


            // 게임 종료 확인 nextTurn이 currentRound를 증가시키므로 여기서 체크
            if (gameState.getCurrentRound() > gameState.getTotalRounds()) {
                gameState.setGameOver(true);
                gameState.setStatus(GameStatus.FINISHED);

                // 순위 계산
                // calculateRanking(gameState); -> Service 로직으로 이동
                gameStateService.calculateRanking(roomId);

                GameMessage response = defaultGameResponse("GAME_OVER", gameState);
                simpMessagingTemplate.convertAndSend("/topic/games/" + roomId, response);
            } else {
                GameMessage response = defaultGameResponse("TURN_COMPLETED", gameState);
                simpMessagingTemplate.convertAndSend("/topic/games/" + roomId, response);
            }
        }
    }

    // fishing : /app/games/fishing/start
    @MessageMapping("/games/fishing/start")
    public void startFishing(StartFishingRequest req, Principal principal) {
        Long actorId = parseActorIdSafely(principal);
        if (actorId == null) return;
        if (req == null || req.getRoomId() == null) return;

        String ht = req.getHarvestType();
        if (ht == null || ht.isBlank()) {
            fishingService.startFishing(req.getRoomId(), actorId);
            return;
        }

        fishingService.startFishing(req.getRoomId(), actorId, ht);
    }

    // fishing : /app/games/fishing/action
    @MessageMapping("/games/fishing/action")
    public void fishingAction(FishingActionRequest req, Principal principal) {
        Long actorId = parseActorIdSafely(principal);
        if (actorId == null) return;
        if (req == null || req.getRoomId() == null || req.getAction() == null) return;

        fishingService.handleAction(req.getRoomId(), actorId, req.getAction());
    }

    // fishing : actorId 안전 파싱
    private Long parseActorIdSafely(Principal principal) {
        if (principal == null || principal.getName() == null) return null;
        try {
            return Long.parseLong(principal.getName());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    // 애플리케이션 종료 시 스케줄러 종료 (메모리 누수 방지)
    @PreDestroy
    public void cleanup() {
        scheduler.shutdown();
        System.out.println("🧹 스케줄러 종료됨");
    }

    // DEV 용: 특정 이벤트 상태로 강제 진입시키고 20초 후 메인보드로 복귀시키기
    @MessageMapping("/games/trigger-event")
    public void triggerEvent(GameMessage message) {
        Long roomId = message.getRoomId();
        String requestedStatusStr = message.getStatus();

        GameState gameState = gameStateService.getGame(roomId);
        if (gameState == null) return;

        GameStatus targetStatus;
        try {
            targetStatus = GameStatus.valueOf(requestedStatusStr);
        } catch (IllegalArgumentException | NullPointerException e) {
            return;
        }

        // 1. 상태 변경 및 전송
        gameState.setStatus(targetStatus);
        GameMessage startResponse = defaultGameResponse("EVENT_START", gameState);
        simpMessagingTemplate.convertAndSend("/topic/games/" + roomId, startResponse);

        // 2. Enum에서 설정한 시간을 가져옴
        int timeout = targetStatus.getTimeoutSeconds();

        // 3. 타임아웃 설정이 있는 상태(0보다 큰 경우)일 때만 스케줄러 실행
        if (timeout > 0) {
            gameState.clearCurrentTimeout();
            ScheduledFuture<?> future = scheduler.schedule(
                    () -> {
                        handleEventTimeout(gameState, targetStatus, roomId);
                    },
                    timeout,
                    TimeUnit.SECONDS
            );
            gameState.setCurrentTimeout(future);
        } else {
            System.out.println(">>> ℹ️ " + targetStatus + " 상태는 제한 시간이 없으므로 스케줄러를 실행하지 않습니다.");
        }
    }

    // DEV 용: 현재 라운드를 강제로 변경
    @MessageMapping("/games/set-round")
    public void setGameRound(GameMessage message) {
        Long roomId = message.getRoomId();
        int targetRound = message.getCurrentRound(); // 재활용

        GameState gameState = gameStateService.getGame(roomId);
        if (gameState == null) return;

        // 라운드 변경
        gameState.setCurrentRound(targetRound);

        // 변경된 상태 전송
        GameMessage response = defaultGameResponse("ROUND_CHANGED", gameState);
        simpMessagingTemplate.convertAndSend("/topic/games/" + roomId, response);
    }
}
