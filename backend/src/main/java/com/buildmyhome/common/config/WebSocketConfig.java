package com.buildmyhome.common.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/*
import com.buildmyhome.common.security.StompAuthChannelInterceptor; // 🔒 로그인 붙이면 추가
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.config.ChannelRegistration;
*/

@EnableWebSocketMessageBroker
@Configuration
// @RequiredArgsConstructor // 🔒 로그인 붙이면 추가
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    // 🔒 로그인 붙이면 추가 (STOMP CONNECT 헤더에서 JWT 읽는 인터셉터)
    // private final StompAuthChannelInterceptor stompAuthChannelInterceptor;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic", "/queue");
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }

    /*
    // 🔒 로그인 붙이면 추가
    // WS는 HttpSecurity 필터를 안 타므로
    // STOMP 인바운드 채널에서 JWT 인증을 직접 처리해야 함
    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(stompAuthChannelInterceptor);
    }
    */
}
