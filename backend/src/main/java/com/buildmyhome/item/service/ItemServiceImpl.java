package com.buildmyhome.item.service;

import com.buildmyhome.game.constants.GameConstants;
import com.buildmyhome.game.dto.GamePlayerState;
import com.buildmyhome.game.dto.GameState;
import com.buildmyhome.game.dto.GameStatus;
import com.buildmyhome.game.dto.ItemType;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class ItemServiceImpl implements ItemService {

    private static final ItemType[] ITEMS = ItemType.values();

    @Override
    public ItemType getRandomItem(GamePlayerState player) {
        return ITEMS[ThreadLocalRandom.current().nextInt(ITEMS.length)];
    }

    @Override
    public void addItem(GamePlayerState player, ItemType item) {
        player.getItems().add(item);
    }

    @Override
    public void swapItem(GamePlayerState player, ItemType dropItem, ItemType newItem) {
        player.getItems().remove(dropItem);
        player.getItems().add(newItem);
    }

    @Override
    public GameStatus useItem(GameState gameState, GamePlayerState player, String useItemType, int useItemIdx) {
        // 1. Enum 변환 검증
        ItemType itemType;
        try {
            itemType = ItemType.valueOf(useItemType);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("존재하지 않는 아이템 타입: " + useItemType);
        }

        // 2. 소유권 검증
        List<ItemType> items = player.getItems();
        if (useItemIdx < 0 || useItemIdx >= items.size()) {
            throw new IllegalArgumentException("잘못된 아이템 인덱스: " + useItemIdx);
        }
        if (items.get(useItemIdx) != itemType) {
            throw new IllegalArgumentException("아이템 타입 불일치: 예상 " + items.get(useItemIdx) + ", 요청 " + itemType);
        }

        // 3. 아이템 제거 및 사용 기록 등록
        items.remove(useItemIdx);
        player.setItemUsed(true);

        // 4. 아이템별 효과 적용
        return switch (itemType) {
            case PIPE -> applyPipe(player);
            case MIRROR -> applyMirror(gameState, player);
            case CUSTOM_DICE -> applyCustomDice(player);
            case DOUBLE_DICE, GOLD_DICE ->
                // TODO: 마지막주에 구현
                    GameStatus.WAITING_PLAYER_ACTION;
            default -> GameStatus.WAITING_PLAYER_ACTION;
        };
    }

    private GameStatus applyCustomDice(GamePlayerState player) {
        return GameStatus.WAITING_CUSTOM_DICE;
    }

    // 토관: 랜덤 위치 이동
    private GameStatus applyPipe(GamePlayerState player) {
        int oldPosition = player.getPosition();
        int newPosition = ThreadLocalRandom.current().nextInt(0, GameConstants.BOARD_SIZE);
        player.setPosition(newPosition);  // 이동할 위치 저장
        player.setActionDataStr("PIPE:" + oldPosition + ":" + newPosition);
        return GameStatus.WAITING_PIPE;
    }

    // 거울: 랜덤 플레이어와 위치 교환
    private GameStatus applyMirror(GameState gameState, GamePlayerState player) {
        List<GamePlayerState> others = gameState.getPlayers().values().stream()
                .filter(p -> !p.getMemberId().equals(player.getMemberId()))
                .toList();

        if (others.isEmpty()) {
            return GameStatus.WAITING_PLAYER_ACTION;
        }

        GamePlayerState other = others.get(ThreadLocalRandom.current().nextInt(others.size()));

        // 위치 교환
        int myPosition = player.getPosition();
        int otherPosition = other.getPosition();
        player.setPosition(otherPosition);
        other.setPosition(myPosition);

        // 프론트 연출용 데이터: "상대ID:내원래위치:상대원래위치"
        player.setActionDataStr("MIRROR:" + other.getMemberId() + ":" + myPosition + ":" + otherPosition);

        return GameStatus.WAITING_MIRROR;
    }


}
