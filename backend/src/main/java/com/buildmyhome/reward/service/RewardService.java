package com.buildmyhome.reward.service;

import com.buildmyhome.game.dto.GamePlayerState;
import com.buildmyhome.game.dto.GameStatus;
import com.buildmyhome.game.dto.HarvestType;
import com.buildmyhome.game.dto.ResourceType;
import java.util.EnumMap;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.stereotype.Service;

@Service
public class RewardService {

    // 과일칸 전용목록
    private static final HarvestType[] FRUIT_TYPES = {
            HarvestType.APPLE,
            HarvestType.ORANGE,
            HarvestType.PEAR,
            HarvestType.PEACH,
            HarvestType.CHERRY,
    };

    // status기준 보상지급
    public RewardResult grantRewardsForStatus(GameStatus nextStatus, GamePlayerState player) {
        if (nextStatus == GameStatus.WAITING_RESOURCES) {
            Map<ResourceType, Integer> gainedResources = grantRandomResources(player);
            return new RewardResult(gainedResources, Map.of());
        }

        if (nextStatus == GameStatus.WAITING_HARVEST) {
            Map<HarvestType, Integer> gainedHarvests = grantRandomFruits(player);
            return new RewardResult(Map.of(), gainedHarvests);
        }

        return new RewardResult(Map.of(), Map.of());
    }

    // 재화2종 지급
    private Map<ResourceType, Integer> grantRandomResources(GamePlayerState player) {
        ResourceType[] all = ResourceType.values();
        if (all.length < 2) return Map.of();

        int n = all.length;

        int i1 = ThreadLocalRandom.current().nextInt(n);
        int i2 = ThreadLocalRandom.current().nextInt(n - 1);
        if (i2 >= i1) i2++;

        ResourceType a = all[i1];
        ResourceType b = all[i2];

        Map<ResourceType, Integer> gained = new EnumMap<>(ResourceType.class);

        // 인벤반영
        player.getResources().put(a, player.getResources().getOrDefault(a, 0) + 1);
        player.getResources().put(b, player.getResources().getOrDefault(b, 0) + 1);

        // 토스트용 반환
        gained.put(a, 1);
        gained.put(b, 1);

        return gained;
    }

    // 과일2종 지급
    private Map<HarvestType, Integer> grantRandomFruits(GamePlayerState player) {
        if (FRUIT_TYPES.length < 2) return Map.of();

        int n = FRUIT_TYPES.length;

        int i1 = ThreadLocalRandom.current().nextInt(n);
        int i2 = ThreadLocalRandom.current().nextInt(n - 1);
        if (i2 >= i1) i2++;

        HarvestType a = FRUIT_TYPES[i1];
        HarvestType b = FRUIT_TYPES[i2];

        Map<HarvestType, Integer> gained = new EnumMap<>(HarvestType.class);

        // 인벤반영
        player.getHarvests().put(a, player.getHarvests().getOrDefault(a, 0) + 1);
        player.getHarvests().put(b, player.getHarvests().getOrDefault(b, 0) + 1);

        // 토스트용 반환
        gained.put(a, 1);
        gained.put(b, 1);

        return gained;
    }

    // 결과dto
    public record RewardResult(
            Map<ResourceType, Integer> gainedResources,
            Map<HarvestType, Integer> gainedHarvests
    ) {}
}
