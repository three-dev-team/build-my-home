package com.buildmyhome.item.service;

import com.buildmyhome.game.dto.GamePlayerState;
import com.buildmyhome.game.dto.ItemType;

public interface ItemService {
    ItemType getRandomItem(GamePlayerState player);

    void addItem(GamePlayerState player, ItemType item);

    void swapItem(GamePlayerState player, ItemType dropItem, ItemType newItem);
}
