package com.buildmyhome.fishing.ws;

import com.buildmyhome.fishing.dto.FishingActionRequest;
import com.buildmyhome.fishing.dto.StartFishingRequest;
import com.buildmyhome.fishing.service.FishingService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
@RequiredArgsConstructor
public class FishingWsController {

    private final FishingService fishingService;

    // 프론트에서 낚시 시작 시 호출하는 WS 엔드포인트
    // - harvestType이 비어있으면: 서버가 소/중/대(동일 확률) 랜덤 선택
    // - harvestType이 있으면: 해당 타입으로 강제 시작(디버그/테스트)
    @MessageMapping("/fishing/start")
    public void start(StartFishingRequest req, Principal principal) {
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

    @MessageMapping("/fishing/action")
    public void action(FishingActionRequest req, Principal principal) {
        Long actorId = parseActorIdSafely(principal);
        if (actorId == null) return;
        if (req == null || req.getRoomId() == null || req.getAction() == null) return;

        fishingService.handleAction(req.getRoomId(), actorId, req.getAction());
    }

    private Long parseActorIdSafely(Principal principal) {
        if (principal == null || principal.getName() == null) return null;
        try {
            return Long.parseLong(principal.getName());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
