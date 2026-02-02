package com.buildmyhome.reward.service;

import com.buildmyhome.game.dto.GamePlayerState;
import com.buildmyhome.game.dto.GameStatus;
import com.buildmyhome.game.dto.HarvestType;
import com.buildmyhome.game.dto.ResourceType;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class GatherFlowService {

    // 재화/과일칸 진입 시(= MOVE_COMPLETE 직후) 프론트 연출에 필요한 데이터(actionDataStr) 세팅
    public void enter(GameStatus status,
                      GamePlayerState player,
                      Map<ResourceType, Integer> gainedResources,
                      Map<HarvestType, Integer> gainedHarvests) {

        // WAITING_RESOURCES / WAITING_HARVEST 상태에서만 처리
        if (status != GameStatus.WAITING_RESOURCES && status != GameStatus.WAITING_HARVEST) return;

        // Discover 단계로 시작
        player.setUiStep(0);

        // 보상 종류(fruit/resource) 결정
        String kind = (status == GameStatus.WAITING_HARVEST) ? "fruit" : "resource";

        // 서버 enum name()을 key로 쓰는 gained + 드랍에 사용할 2종 dropKeys
        Map<String, Integer> gained = new LinkedHashMap<>();
        List<String> dropKeys = new ArrayList<>(2);

        // 과일 보상 처리
        if ("fruit".equals(kind)) {
            if (gainedHarvests != null) {
                for (Map.Entry<HarvestType, Integer> e : gainedHarvests.entrySet()) {
                    if (e.getKey() == null || e.getValue() == null) continue;

                    int qty = e.getValue();
                    if (qty <= 0) continue;

                    String key = e.getKey().name();
                    gained.put(key, qty);

                    // 드랍 연출에 쓸 키 최대 2개만 저장
                    if (dropKeys.size() < 2) dropKeys.add(key);
                }
            }
        }
        // 재화 보상 처리
        else {
            if (gainedResources != null) {
                for (Map.Entry<ResourceType, Integer> e : gainedResources.entrySet()) {
                    if (e.getKey() == null || e.getValue() == null) continue;

                    int qty = e.getValue();
                    if (qty <= 0) continue;

                    String key = e.getKey().name();
                    gained.put(key, qty);

                    // 드랍 연출에 쓸 키 최대 2개만 저장
                    if (dropKeys.size() < 2) dropKeys.add(key);
                }
            }
        }

        // 문구/자막용 닉네임(프론트에서 필요 없으면 무시 가능)
        String playername = player.getNickname();

        // actionDataStr에 연출 데이터 포함
        String actionDataStr = buildJson(kind, gained, dropKeys, playername);
        player.setActionDataStr(actionDataStr);
    }

    // actionDataStr(JSON) 문자열 생성: kind + gained + dropKeys + playername
    private String buildJson(String kind,
                             Map<String, Integer> gained,
                             List<String> dropKeys,
                             String playername) {
        StringBuilder sb = new StringBuilder();
        sb.append("{");

        sb.append("\"kind\":\"").append(escape(kind)).append("\",");

        // gained: {"IRON":2,"CLAY":1} 형태
        sb.append("\"gained\":{");
        int i = 0;
        for (Map.Entry<String, Integer> e : gained.entrySet()) {
            if (i++ > 0) sb.append(",");
            sb.append("\"").append(escape(e.getKey())).append("\":").append(e.getValue());
        }
        sb.append("},");

        // dropKeys: ["IRON","CLAY"] 형태(최대 2개)
        sb.append("\"dropKeys\":[");
        if (dropKeys != null) {
            for (int k = 0; k < dropKeys.size(); k++) {
                if (k > 0) sb.append(",");
                sb.append("\"").append(escape(dropKeys.get(k))).append("\"");
            }
        }
        sb.append("]");

        // playername: 자막/문구용(있을 때만 포함)
        if (playername != null) {
            sb.append(",\"playername\":\"").append(escape(playername)).append("\"");
        }

        sb.append("}");
        return sb.toString();
    }

    // JSON 문자열용 최소 이스케이프 처리
    private String escape(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
