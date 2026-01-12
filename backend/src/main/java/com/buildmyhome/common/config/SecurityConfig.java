package com.buildmyhome.common.config;

import com.buildmyhome.common.jwt.JwtAuthenticationFilter;
import com.buildmyhome.common.security.handler.OAuth2SuccessHandler;
import com.buildmyhome.common.security.service.CustomOAuth2UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@EnableWebSecurity
@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    private final CustomOAuth2UserService customOAuth2UserService;
    private final OAuth2SuccessHandler oAuth2SuccessHandler;

    @Bean
    PasswordEncoder passwordEncoder() {
        return PasswordEncoderFactories.createDelegatingPasswordEncoder();
    }


    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)

                // 세션을 사용하지 않으므로 STATELESS 설정
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // 권한 없이 접근 가능한 경로
                        .requestMatchers(
                                "/api/member/join",
                                "/api/member/login",
                                "/api/member/check-nickname",
                                "/api/member/check-email",
                                "/api/member/send-code",
                                "/api/member/send-registration-code",
                                "/api/member/verify-code",
                                "/api/member/reset-password"
                        ).permitAll()

                        // OAuth2 로그인 관련 경로
                        .requestMatchers("/oauth2/**", "/login/oauth2/**").permitAll()
                        .requestMatchers("/ws/**").permitAll()
                        // 내 정보 조회는 인증 필수
                        .requestMatchers("/api/member/me").authenticated()

                        // 그 외는 일단 허용 (필요 시 점진적으로 잠그기)
                        .anyRequest().permitAll()
                )

                // OAuth2 로그인 설정
                .oauth2Login(oauth2 -> oauth2
                        // 소셜 로그인 성공 후 사용자 정보를 가져오는 서비스 설정 (DB 저장 등)
                        .userInfoEndpoint(userInfo -> userInfo.userService(customOAuth2UserService))
                        // 로그인 성공 시 JWT 발급 및 프론트엔드 리다이렉트 처리
                        .successHandler(oAuth2SuccessHandler)
                )

                // JWT 인증 필터를 UsernamePasswordAuthenticationFilter 앞에 배치
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
