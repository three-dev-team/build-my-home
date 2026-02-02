package com.buildmyhome.reward.service;

import com.buildmyhome.game.dto.GamePlayerState;
import com.buildmyhome.game.dto.GameStatus;
import com.buildmyhome.game.dto.HarvestType;
import com.buildmyhome.game.dto.ResourceType;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.stereotype.Service;

@Service
public class RewardService {

    // 과일칸 전용 목록(리소스/생선과 분리된 “과일”만)
    private static final HarvestType[] FRUIT_TYPES = {
            HarvestType.APPLE,
            HarvestType.ORANGE,
            HarvestType.PEAR,
            HarvestType.PEACH,
            HarvestType.CHERRY,
    };

    // 다음 스테이터스가 보상칸(재화/과일)일 때: 인벤 반영 + 연출용 actionDataStr/uiStep 세팅
    public RewardResult prepareReward(GameStatus nextStatus, GamePlayerState player) {
        RewardResult rr = grantRewardsForStatus(nextStatus, player);

        if (nextStatus != GameStatus.WAITING_RESOURCES && nextStatus != GameStatus.WAITING_HARVEST) {
            return rr;
        }

        Integer cur = player.getUiStep();
        if (cur != null && cur > 0) return rr;

        player.setUiStep(0);

        String kind = (nextStatus == GameStatus.WAITING_HARVEST) ? "fruit" : "resource";

        Map<String, Integer> gained = new LinkedHashMap<>();
        List<String> dropKeys = new ArrayList<>(2);

        if ("fruit".equals(kind)) {
            Map<HarvestType, Integer> gainedHarvests = rr.gainedHarvests();
            if (gainedHarvests != null) {
                for (Map.Entry<HarvestType, Integer> e : gainedHarvests.entrySet()) {
                    HarvestType type = e.getKey();
                    Integer qtyObj = e.getValue();
                    if (type == null || qtyObj == null) continue;

                    int qty = qtyObj;
                    if (qty <= 0) continue;

                    String key = type.name();
                    gained.put(key, qty);
                    if (dropKeys.size() < 2) dropKeys.add(key);
                }
            }
        } else {
            Map<ResourceType, Integer> gainedResources = rr.gainedResources();
            if (gainedResources != null) {
                for (Map.Entry<ResourceType, Integer> e : gainedResources.entrySet()) {
                    ResourceType type = e.getKey();
                    Integer qtyObj = e.getValue();
                    if (type == null || qtyObj == null) continue;

                    int qty = qtyObj;
                    if (qty <= 0) continue;

                    String key = type.name();
                    gained.put(key, qty);
                    if (dropKeys.size() < 2) dropKeys.add(key);
                }
            }
        }

        String playername = player.getNickname();
        player.setActionDataStr(buildRewardJson(kind, gained, dropKeys, playername));

        return rr;
    }

    // nextStatus에 맞는 보상을 실제로 지급(플레이어 인벤에 반영)하고, 토스트/연출용 요약 데이터를 반환
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

    // 재화(ResourceType) 중 서로 다른 2종을 랜덤으로 지급(각 1개), player.resources에 누적 반영
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

        player.getResources().put(a, player.getResources().getOrDefault(a, 0) + 1);
        player.getResources().put(b, player.getResources().getOrDefault(b, 0) + 1);

        gained.put(a, 1);
        gained.put(b, 1);

        return gained;
    }

    // 과일(HarvestType) 중 서로 다른 2종을 랜덤으로 지급(각 1개), player.harvests에 누적 반영
    private Map<HarvestType, Integer> grantRandomFruits(GamePlayerState player) {
        if (FRUIT_TYPES.length < 2) return Map.of();

        int n = FRUIT_TYPES.length;
        int i1 = ThreadLocalRandom.current().nextInt(n);
        int i2 = ThreadLocalRandom.current().nextInt(n - 1);
        if (i2 >= i1) i2++;

        HarvestType a = FRUIT_TYPES[i1];
        HarvestType b = FRUIT_TYPES[i2];

        Map<HarvestType, Integer> gained = new EnumMap<>(HarvestType.class);

        player.getHarvests().put(a, player.getHarvests().getOrDefault(a, 0) + 1);
        player.getHarvests().put(b, player.getHarvests().getOrDefault(b, 0) + 1);

        gained.put(a, 1);
        gained.put(b, 1);

        return gained;
    }

    // 프론트가 읽을 actionDataStr(JSON) 생성: kind(재화/과일) + gained(수량) + dropKeys(최대2) + playername
    private String buildRewardJson(String kind, Map<String, Integer> gained, List<String> dropKeys, String playername) {
        StringBuilder sb = new StringBuilder();
        sb.append("{");

        sb.append("\"kind\":\"").append(escape(kind)).append("\",");

        sb.append("\"gained\":{");
        int i = 0;
        for (Map.Entry<String, Integer> e : gained.entrySet()) {
            if (i++ > 0) sb.append(",");
            sb.append("\"").append(escape(e.getKey())).append("\":").append(e.getValue());
        }
        sb.append("},");

        sb.append("\"dropKeys\":[");
        if (dropKeys != null) {
            for (int k = 0; k < dropKeys.size(); k++) {
                if (k > 0) sb.append(",");
                sb.append("\"").append(escape(dropKeys.get(k))).append("\"");
            }
        }
        sb.append("]");

        if (playername != null) {
            sb.append(",\"playername\":\"").append(escape(playername)).append("\"");
        }

        sb.append("}");
        return sb.toString();
    }

    // JSON 문자열에 들어갈 값의 따옴표/백슬래시만 최소 이스케이프
    private String escape(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    // 보상 지급 결과 요약 DTO(리소스/과일 중 하나만 채워서 반환)
    public record RewardResult(
            Map<ResourceType, Integer> gainedResources,
            Map<HarvestType, Integer> gainedHarvests
    ) {}
}
