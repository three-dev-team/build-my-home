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
// TODO(공통화-RoomEventWsController):
// [현재 역할]
// - 낚시 WS 엔드포인트 진입점이다.
//   - /app/fishing/start  : 낚시 이벤트 시작 요청을 받는다.
//   - /app/fishing/action : 진행 중 낚시 이벤트에 대한 액션(HIT/REEL_START/REEL_STOP)을 받는다.
// - Principal에서 actorId(memberId)를 파싱해서 서비스(FishingService)에 넘긴다.
// - actorId가 없거나 파싱 실패 시 현재는 "조용히 무시(return)"한다.
//
// [왜 공통으로 빼야 하나]
// - 앞으로 상점/대출/선택지/다른 미니게임도 WS 컨트롤러가 생기면,
//   Principal 파싱 + 인증 실패 처리 + 예외 처리 정책이 컨트롤러마다 복붙된다.
// - 컨트롤러마다 "principal 없을 때" 정책이 달라지면(어디는 무시, 어디는 에러 브로드캐스트)
//   프론트/QA가 동작을 예측하기 어려워지고, 보안/규칙 누락도 생기기 쉽다.
// - 이벤트 메시지(type/eventType) 공통화가 진행되면, WS 진입점도 eventType 기반 라우팅으로 통합하는 편이 유지보수에 유리하다.
public class FishingWsController {

    private final FishingService fishingService;

    //
    @MessageMapping("/fishing/start")
    public void start(StartFishingRequest req, Principal principal) {
        Long actorId = parseActorIdSafely(principal);
        if (actorId == null) {
            // principal이 없으면 서비스 쪽에서 에러 브로드캐스트하기가 애매하니 조용히 무시하거나,
            // 여기서 예외를 던져 @MessageExceptionHandler로 처리하는 방식도 가능.
            return;
        }
        fishingService.startFishing(req.getRoomId(), actorId, req.getHarvestType());
    }

    @MessageMapping("/fishing/action")
    public void action(FishingActionRequest req, Principal principal) {
        Long actorId = parseActorIdSafely(principal);
        if (actorId == null) return;

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

