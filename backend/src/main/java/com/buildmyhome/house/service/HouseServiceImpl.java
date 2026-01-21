package com.buildmyhome.house.service;

import com.buildmyhome.game.dto.GamePlayerState;
import com.buildmyhome.game.dto.ResourceType;
import com.buildmyhome.house.constants.HouseLevel;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.EnumMap;
import java.util.Map;

@Service
public class HouseServiceImpl implements HouseService {
    @Override
    public void updateHouseInfo(GamePlayerState player) {
        HouseLevel nextLevel = player.getHouseLevel().getNext();

        // 최고 레벨이면
        if (nextLevel == null) {
            player.setCanUpgradeHouse(false);
            player.setNextHouseLevel(null);
            player.setRequiredResourcesForNextHouse(Collections.emptyMap());
            return;
        }

        player.setNextHouseLevel(nextLevel);
        player.setCanUpgradeHouse(canUpgrade(player, nextLevel));
        player.setRequiredResourcesForNextHouse(calculateRequiredResources(player, nextLevel));
    }

    @Override
    public void upgradeHouse(GamePlayerState player) {
        HouseLevel nextLevel = player.getNextHouseLevel();
        if(nextLevel==null || !player.isCanUpgradeHouse()) return;

        // 벨 차감
        player.setBell(player.getBell() - nextLevel.getBell());

        // 자원 차감
        for (Map.Entry<ResourceType, Integer> resource : nextLevel.getRequiredResources().entrySet()) {
            deleteResource(player, resource.getKey(), resource.getValue());
        }

        player.setHouseLevel(nextLevel);
        updateHouseInfo(player);
    }

    private Map<ResourceType, Integer> calculateRequiredResources(GamePlayerState player, HouseLevel next) {
        Map<ResourceType, Integer> required = new EnumMap<>(ResourceType.class);

        for (Map.Entry<ResourceType, Integer> resource : next.getRequiredResources().entrySet()) {
            int have = getResource(player, resource.getKey());
            int need = resource.getValue();
            int diff = need - have;
            if (diff > 0) required.put(resource.getKey(), diff);
        }
        return required;
    }

    private boolean canUpgrade(GamePlayerState player, HouseLevel nextLevel) {
        if (player.getBell() < nextLevel.getBell()) return false;

        // resource -> key: ResourceType, value: 필요한 개수
        for (Map.Entry<ResourceType, Integer> resource : nextLevel.getRequiredResources().entrySet()) {
            ResourceType type = resource.getKey();    // 재화 종류
            int need = resource.getValue();           // 필요한 개수
            int have = getResource(player, type);     // 가진 개수
            if (have < need) return false;
        }
        return true;
    }

    private int getResource(GamePlayerState player, ResourceType type) {
        return player.getResources().getOrDefault(type, 0); // getOrDefault: key가 있으면 값 반환, 없으면 0 반환
    }

    private void deleteResource(GamePlayerState player, ResourceType type, int amount) {
        if (amount > 0) {
            int current = getResource(player, type);
            player.getResources().put(type, current - amount);
        }
    }


}
