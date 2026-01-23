package com.buildmyhome.common.websocket;

import com.buildmyhome.common.jwt.UserSessionStore;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.security.Principal;

@Component
@RequiredArgsConstructor
public class WebSocketEventListener {

    private final UserSessionStore userSessionStore;

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        Principal user = event.getUser();

        // 인증된 사용자라면 세션 스토어에서 제거
        if (user != null) {
            try {
                Long memberId = Long.parseLong(user.getName());
                // 해당 유저의 세션 정보 삭제 (탭 닫을 때)
                userSessionStore.removeSession(memberId);
                System.out.println(">>> [WS] Session Removed for Member: " + memberId);
            } catch (NumberFormatException e) {
                System.err.println(">>> [WS] Failed to parse memberId from Principal: " + user.getName());
            }
        }
    }
}
