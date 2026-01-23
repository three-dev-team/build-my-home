package com.buildmyhome.game.controller;

import com.buildmyhome.fishing.dto.FishingActionRequest;
import com.buildmyhome.fishing.dto.StartFishingRequest;
import com.buildmyhome.fishing.service.FishingService;
import com.buildmyhome.game.constants.BoardData;
import com.buildmyhome.game.constants.TileType;
import com.buildmyhome.game.dto.*;
import com.buildmyhome.game.service.GameStateService;
import com.buildmyhome.game.service.MoveService;
import com.buildmyhome.house.service.HouseService;
import com.buildmyhome.kk.KKService;
import com.buildmyhome.loan.service.LoanService;
import com.buildmyhome.room.dto.RoomPlayerState;
import com.buildmyhome.room.dto.RoomState;
import com.buildmyhome.room.service.RoomStateService;
import com.buildmyhome.shop.dto.ShopType;
import com.buildmyhome.shop.service.ShopService;
import com.buildmyhome.stamp.service.StampService;
import com.buildmyhome.start.StartService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.*;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.TimeUnit;

import static com.buildmyhome.game.constants.GameConstants.*;

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
    private final MoveService moveService;
    private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);

    // TODO: 추후 GameEventService로 분리 - Tiffany
    // 타임아웃 됐을 때 자동으로 턴이 넘어가는 칸이 아닐 경우 여기서 처리
    // ex) 타임아웃 됐을 경우 KK는 입장료를 반드시 납부하고, 공연을 관람하게 해야함
    private void handleEventTimeout(GameState gameState, GameStatus status, Long roomId) {
        if (gameState.getStatus() != status) return;
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
            case WAITING_START:
                if (player.getRemainingMoves() > 0) {
                    int remaining = player.getRemainingMoves();
                    moveService.movePlayer(player, remaining);
                    gameState.setStatus(GameStatus.MOVING);

                    response = defaultGameResponse("CONTINUE_MOVING", gameState);
                } else {
                    // 남은 거리가 없다면
                    gameState.nextTurn();
                    response = defaultGameResponse("EVENT_TIMEOUT", gameState);
                }
                break;

            // 기본은 다음 턴으로 넘어감
            default:
                gameState.nextTurn();
                response = defaultGameResponse("EVENT_TIMEOUT", gameState);
                break;
        }

        simpMessagingTemplate.convertAndSend("/topic/games/" + roomId, response);
    }

    // 서버메모리 -> 프론트로 전달하는 공통 응답 DTO 생성하는 메서드
    private GameMessage defaultGameResponse(String type, GameState gameState) {
        GameMessage response = new GameMessage();
        response.setType(type);
        response.setCurrentPlayerId(gameState.getCurrentPlayerId());
        response.setStatus(gameState.getStatus().name());
        response.setPlayers(new ArrayList<>(gameState.getPlayers().values()));
        response.setTurnOrder(gameState.getTurnOrder());
        response.setCurrentRound(gameState.getCurrentRound());
        response.setTotalRounds(gameState.getTotalRounds());

        // 타임아웃 계산 로직 (경과 시간 반영)
        int definitionTimeout = gameState.getStatus().getTimeoutSeconds();
        if (definitionTimeout > 0 && gameState.getStatusUpdatedAt() != null) {
            long elapsedSeconds = java.time.Duration.between(gameState.getStatusUpdatedAt(), java.time.LocalDateTime.now()).toSeconds();
            int remainingSeconds = Math.max(0, definitionTimeout - (int) elapsedSeconds);
            response.setTimeoutSeconds(remainingSeconds);
        } else {
            response.setTimeoutSeconds(definitionTimeout);
        }
        return response;
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

        GameState gameState = new GameState(roomId);
        gameState.setStatus(GameStatus.INTRO);
        gameState.setTotalRounds(room.getTotalRounds());

        for (RoomPlayerState player : room.getPlayers().values()) {
            gameState.addPlayer(new GamePlayerState(player.getMemberId(), player.getNickname(), player.getCharacterId()));
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
            boolean allDone = gameState.getPlayers().values().stream().allMatch(p -> p.getOrderDiceValue() != null);

            if (allDone) {
                // 높은 숫자 순으로 정렬해서 turnOrder 생성
                List<Long> sortedTurnOrder = gameState.getPlayers().values().stream().sorted(Comparator.comparing(GamePlayerState::getOrderDiceValue).reversed()).map(GamePlayerState::getMemberId).toList();

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
            if (!memberId.equals(gameState.getCurrentPlayerId()) || gameState.getStatus() != GameStatus.WAITING_PLAYER_ACTION) {
                // 잘못된 턴이거나 상태일 경우 에러 메시지 전송 로직 추가 가능
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

            // 플레이어 이동 처리
            moveService.movePlayer(player, diceValue);
            gameState.setStatus(GameStatus.MOVING);

            GameMessage response = defaultGameResponse("DICE_ROLLED", gameState);
            response.setDiceValue(diceValue);
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

            // 플레이어가 도착한 칸에 맞는 상태로 전환 (예: KK 칸이면 WAITING_KK)
            GameStatus nextStatus = BoardData.getNextStatus(player.getPosition());
            gameState.setStatus(nextStatus);

            // 이번 moveComplete로 얻은 보상(있을 때만 채움)
            Map<ResourceType, Integer> gainedResources = null;
            Map<HarvestType, Integer> gainedHarvests = null;

            // 칸 종류에 따라 보상 지급
            if (nextStatus == GameStatus.WAITING_RESOURCES) {
                // 재화칸: ResourceType 중 랜덤 2종(중복 없음) 각각 +1
                gainedResources = grantRandomResources(player);
            } else if (nextStatus == GameStatus.WAITING_HARVEST) {
                // 과일칸: 지정 과일 5종 중 랜덤 2종(중복 없음) 각각 +1
                gainedHarvests = grantRandomFruits(player);
            }

            if (nextStatus == GameStatus.WAITING_SHOP_ITEM) {
                shopService.startShopSession(roomId, memberId, ShopType.ITEM_SHOP);
                System.out.println("🏪 아이템 상점 세션 생성: memberId=" + memberId);
            } else if (nextStatus == GameStatus.WAITING_SHOP_RESOURCE) {
                shopService.startShopSession(roomId, memberId, ShopType.HARVEST_SHOP);
                System.out.println("🏪 재화 상점 세션 생성: memberId=" + memberId);
            }

            // 타임아웃이 설정된 상태라면 스케줄러로 타임아웃 처리 등록
            if (nextStatus.isAutoProceed()) {
                scheduler.schedule(() -> {
                    synchronized (gameState) {
                        handleEventTimeout(gameState, nextStatus, roomId);
                    }
                }, nextStatus.getTimeoutSeconds(), TimeUnit.SECONDS);
            }

            GameMessage response = defaultGameResponse("MOVE_COMPLETE", gameState);
            // 이번에 얻은 보상을 메시지에 실어 보냄(프론트에서 토스트/연출 가능)
            response.setGainedResources(gainedResources);
            response.setGainedHarvests(gainedHarvests);
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
            if (!memberId.equals(gameState.getCurrentPlayerId())) return;

            GamePlayerState player = gameState.getPlayers().get(memberId);

            try {
                GameMessage response = defaultGameResponse("ACTION_PROCESSED", gameState);

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
                    case "SHOP_BUY_ITEM":
                        // 아이템 구매 로직 처리
                        shopService.buyItem(roomId, memberId, message.getItemType());
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
                    case "OPEN_ATM":
                        gameState.setStatus(GameStatus.WAITING_ATM);
                        response.setType("ATM_OPENED");
                        break;
                    case "CLOSE_ACTION":
                        player.setUiStep(0); // UI 스텝 초기화
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

                }

                response.setStatus(gameState.getStatus().name());
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
            if (!memberId.equals(gameState.getCurrentPlayerId())) {
                return;
            }
            GamePlayerState player = gameState.getPlayers().get(memberId);

            if (player.getRemainingMoves() > 0) {
                int remainingMoves = player.getRemainingMoves();
                // 남은 이동 칸이 있으면 MOVING 상태로 복귀
                moveService.movePlayer(player, remainingMoves);
                gameState.setStatus(GameStatus.MOVING);
                GameMessage response = defaultGameResponse("CONTINUE_MOVING", gameState);
                // 프론트 애니메이션 작업 위해 남은 거리를 보내야할 경우
                // response.setActionData(remainingMoves);
                simpMessagingTemplate.convertAndSend("/topic/games/" + roomId, response);
                return;
            } else {
                // 한 바퀴 다 돌면 라운드 증가
                gameState.nextTurn();

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
            scheduler.schedule(() -> {
                handleEventTimeout(gameState, targetStatus, roomId);
            }, timeout, TimeUnit.SECONDS);
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

    // TODO: 추후 GameRewardService로 분리(BMH:31) - Tiffany
    // 과일 칸에서만 쓸 과일 목록
    // - ResourceType은 values() 전체가 대상이라 별도 배열이 필요 없음
    private static final HarvestType[] FRUIT_TYPES = {HarvestType.APPLE, HarvestType.ORANGE, HarvestType.PEAR, HarvestType.PEACH, HarvestType.CHERRY};

    // 재화칸 보상: ResourceType 전체 중 중복 없이 2종을 뽑아서 각 +1 지급
    // 중복 없이 2개를 뽑기 위해 인덱스 2개를 겹치지 않게 생성
    // player.resources에 실제 지급 반영 + 이번에 얻은 목록을 Map으로 반환
    private Map<ResourceType, Integer> grantRandomResources(GamePlayerState player) {
        ResourceType[] all = ResourceType.values();
        if (all.length < 2) return Map.of(); // 방어(종류가 2개 미만이면 지급 불가)

        int n = all.length;
        int i1 = ThreadLocalRandom.current().nextInt(n);
        int i2 = ThreadLocalRandom.current().nextInt(n - 1);
        if (i2 >= i1) i2++; // i1과 겹치지 않게 보정

        ResourceType a = all[i1];
        ResourceType b = all[i2];

        // EnumMap: enum 키에 최적화(가볍고 빠름)
        Map<ResourceType, Integer> gained = new EnumMap<>(ResourceType.class);

        // 실제 지급(각 1개씩)
        player.getResources().put(a, player.getResources().get(a) + 1);
        player.getResources().put(b, player.getResources().get(b) + 1);

        // 이번에 얻은 것만 별도로 반환(프론트 표시용)
        gained.put(a, 1);
        gained.put(b, 1);
        return gained;
    }

    // 과일칸 보상: FRUIT_TYPES(5종) 중 중복 없이 2종을 뽑아서 각 +1 지급
    private Map<HarvestType, Integer> grantRandomFruits(GamePlayerState player) {
        if (FRUIT_TYPES.length < 2) return Map.of();

        int n = FRUIT_TYPES.length;
        int i1 = ThreadLocalRandom.current().nextInt(n);
        int i2 = ThreadLocalRandom.current().nextInt(n - 1);
        if (i2 >= i1) i2++;

        HarvestType a = FRUIT_TYPES[i1];
        HarvestType b = FRUIT_TYPES[i2];

        Map<HarvestType, Integer> gained = new EnumMap<>(HarvestType.class);

        player.getHarvests().put(a, player.getHarvests().get(a) + 1);
        player.getHarvests().put(b, player.getHarvests().get(b) + 1);

        gained.put(a, 1);
        gained.put(b, 1);
        return gained;
    }
}
