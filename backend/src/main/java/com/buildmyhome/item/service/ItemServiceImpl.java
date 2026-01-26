package com.buildmyhome.item.service;

import com.buildmyhome.game.dto.GamePlayerState;
import com.buildmyhome.game.dto.ItemType;
import org.springframework.stereotype.Service;

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
}
