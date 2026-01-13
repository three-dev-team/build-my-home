package com.buildmyhome.common.websocket;

import com.buildmyhome.common.jwt.JwtTokenProvider;
import com.buildmyhome.member.entity.Member;
import com.buildmyhome.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

import java.security.Principal;

@Component
@RequiredArgsConstructor
public class WebSocketAuthChannelInterceptor implements ChannelInterceptor {

    private final JwtTokenProvider jwtTokenProvider;
    private final MemberRepository memberRepository;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {

        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor == null) return message;

        // CONNECT 명령일 때만 검사 (웹소켓 최초 연결 시도 시)
        if (StompCommand.CONNECT.equals(accessor.getCommand())) {

            // 헤더에서 "Authorization" 토큰 추출
            String authHeader = accessor.getFirstNativeHeader("Authorization"); // 토큰 받아서
            if (authHeader == null) authHeader = accessor.getFirstNativeHeader("authorization");

            // 토큰 추출 및 검증
            String token = null;
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                token = authHeader.substring(7);
            }
            if (token == null || !jwtTokenProvider.validateToken(token)) {
                throw new IllegalArgumentException("인증 토큰이 없거나 유효하지 않습니다.");
            }

            // 토큰에서 멤버 이메일 추출(memberId 가져오기 위해서)
            String email = jwtTokenProvider.getEmail(token);

            // 이메일로 DB에서 멤버 조회
            Member member = memberRepository.findByEmail(email)
                    .orElseThrow(() -> new IllegalArgumentException("회원 정보를 찾을 수 없습니다."));

            // 멤버 ID를 Principal로 설정
            Principal principal = () -> String.valueOf(member.getId());

            // 이 웹소켓 연결(헤더)에 유저 정보 저장
            accessor.setUser(principal);
            accessor.setLeaveMutable(true);
            return MessageBuilder.createMessage(message.getPayload(), accessor.getMessageHeaders());
        }

        return message;
    }
}
