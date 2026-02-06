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

    // 과일칸 보상에만 쓰는 과일 타입 목록(리소스/생선 등 제외)
    private static final HarvestType[] FRUIT_TYPES = {
            HarvestType.APPLE,
            HarvestType.ORANGE,
            HarvestType.PEAR,
            HarvestType.PEACH,
            HarvestType.CHERRY,
    };

    // 보상칸 진입 시: 인벤 지급 + uiStep 리셋 + 프론트 연출용 actionDataStr(JSON) 세팅
    public RewardResult prepareReward(GameStatus nextStatus, GamePlayerState player) {
        // nextStatus 기준으로 실제 보상을 지급하고 요약 결과를 받음
        RewardResult rr = grantRewardsForStatus(nextStatus, player);

        // 보상칸이 아니면 uiStep/actionDataStr는 건드리지 않고 지급 결과만 반환
        if (nextStatus != GameStatus.WAITING_RESOURCES && nextStatus != GameStatus.WAITING_HARVEST) {
            return rr;
        }

        // 보상칸 진입 시 항상 Discover부터 시작하도록 uiStep을 0으로 초기화
        player.setUiStep(0);

        // 프론트 연출 분기용 kind("fruit" | "resource")
        String kind = (nextStatus == GameStatus.WAITING_HARVEST) ? "fruit" : "resource";

        // 프론트가 읽을 gained 맵(키=enum name, 값=수량)
        Map<String, Integer> gained = new LinkedHashMap<>();

        // 프론트에서 드롭 연출로 쓸 키 목록(최대 2개)
        List<String> dropKeys = new ArrayList<>(2);

        // 과일 보상일 때: rr.gainedHarvests에서 gained/dropKeys 구성
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
            // 재화 보상일 때: rr.gainedResources에서 gained/dropKeys 구성
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

        // 프론트 표시용 닉네임(없을 수 있음)
        String playername = player.getNickname();

        // 프론트 연출용 JSON은 매번 새로 세팅해서 이전 값 잔상 방지
        player.setActionDataStr(buildRewardJson(kind, gained, dropKeys, playername));

        return rr;
    }

    // nextStatus에 맞는 보상을 실제로 지급하고(인벤 누적), 지급 요약 결과를 반환
    public RewardResult grantRewardsForStatus(GameStatus nextStatus, GamePlayerState player) {
        // 재화칸이면 ResourceType 2종(각 1개) 지급
        if (nextStatus == GameStatus.WAITING_RESOURCES) {
            Map<ResourceType, Integer> gainedResources = grantRandomResources(player);
            return new RewardResult(gainedResources, Map.of());
        }

        // 과일칸이면 FRUIT_TYPES 중 2종(각 1개) 지급
        if (nextStatus == GameStatus.WAITING_HARVEST) {
            Map<HarvestType, Integer> gainedHarvests = grantRandomFruits(player);
            return new RewardResult(Map.of(), gainedHarvests);
        }

        // 보상칸이 아니면 빈 결과 반환
        return new RewardResult(Map.of(), Map.of());
    }

    // ResourceType 전체 중 서로 다른 2종을 뽑아 각 1개 지급하고, player.resources에 누적 반영
    private Map<ResourceType, Integer> grantRandomResources(GamePlayerState player) {
        ResourceType[] all = ResourceType.values();
        if (all.length < 2) return Map.of();

        int n = all.length;

        // 첫 번째 인덱스
        int i1 = ThreadLocalRandom.current().nextInt(n);

        // 두 번째 인덱스(충돌 방지용 n-1 뽑기 + 보정)
        int i2 = ThreadLocalRandom.current().nextInt(n - 1);
        if (i2 >= i1) i2++;

        ResourceType a = all[i1];
        ResourceType b = all[i2];

        // 지급 요약 맵(enum 키 유지)
        Map<ResourceType, Integer> gained = new EnumMap<>(ResourceType.class);

        // 플레이어 인벤 누적 반영
        player.getResources().put(a, player.getResources().getOrDefault(a, 0) + 1);
        player.getResources().put(b, player.getResources().getOrDefault(b, 0) + 1);

        gained.put(a, 1);
        gained.put(b, 1);

        return gained;
    }

    // FRUIT_TYPES 중 서로 다른 2종을 뽑아 각 1개 지급하고, player.harvests에 누적 반영
    private Map<HarvestType, Integer> grantRandomFruits(GamePlayerState player) {
        if (FRUIT_TYPES.length < 2) return Map.of();

        int n = FRUIT_TYPES.length;

        // 첫 번째 인덱스
        int i1 = ThreadLocalRandom.current().nextInt(n);

        // 두 번째 인덱스(충돌 방지용 n-1 뽑기 + 보정)
        int i2 = ThreadLocalRandom.current().nextInt(n - 1);
        if (i2 >= i1) i2++;

        HarvestType a = FRUIT_TYPES[i1];
        HarvestType b = FRUIT_TYPES[i2];

        // 지급 요약 맵(enum 키 유지)
        Map<HarvestType, Integer> gained = new EnumMap<>(HarvestType.class);

        // 플레이어 인벤 누적 반영
        player.getHarvests().put(a, player.getHarvests().getOrDefault(a, 0) + 1);
        player.getHarvests().put(b, player.getHarvests().getOrDefault(b, 0) + 1);

        gained.put(a, 1);
        gained.put(b, 1);

        return gained;
    }

    // actionDataStr용 JSON 생성(kind/gained/dropKeys/playername)
    private String buildRewardJson(String kind, Map<String, Integer> gained, List<String> dropKeys, String playername) {
        StringBuilder sb = new StringBuilder();
        sb.append("{");

        sb.append("\"kind\":\"").append(escape(kind)).append("\",");

        // gained는 {"KEY":qty, ...} 형태로 직렬화
        sb.append("\"gained\":{");
        int i = 0;
        for (Map.Entry<String, Integer> e : gained.entrySet()) {
            if (i++ > 0) sb.append(",");
            sb.append("\"").append(escape(e.getKey())).append("\":").append(e.getValue());
        }
        sb.append("},");

        // dropKeys는 ["KEY1","KEY2"] 형태로 직렬화
        sb.append("\"dropKeys\":[");
        if (dropKeys != null) {
            for (int k = 0; k < dropKeys.size(); k++) {
                if (k > 0) sb.append(",");
                sb.append("\"").append(escape(dropKeys.get(k))).append("\"");
            }
        }
        sb.append("]");

        // playername은 있을 때만 포함
        if (playername != null) {
            sb.append(",\"playername\":\"").append(escape(playername)).append("\"");
        }

        sb.append("}");
        return sb.toString();
    }

    // JSON 문자열 값에 대해 백슬래시/따옴표만 최소 이스케이프
    private String escape(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    // 보상 지급 요약 반환용 DTO(리소스/과일 중 하나만 채워서 반환)
    public record RewardResult(
            Map<ResourceType, Integer> gainedResources,
            Map<HarvestType, Integer> gainedHarvests
    ) {}
}
