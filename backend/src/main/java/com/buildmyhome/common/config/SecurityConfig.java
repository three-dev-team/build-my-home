package com.buildmyhome.common.config;

import com.buildmyhome.common.jwt.JwtAuthenticationFilter;
import com.buildmyhome.common.jwt.JwtTokenProvider;
import com.buildmyhome.common.security.handler.OAuth2SuccessHandler;
import com.buildmyhome.common.security.service.CustomOAuth2UserService;
import java.util.Arrays;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
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
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@EnableWebSecurity
@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

  private final JwtTokenProvider jwtTokenProvider;
  private final com.buildmyhome.common.jwt.UserSessionStore userSessionStore;

  private final CustomOAuth2UserService customOAuth2UserService;
  private final OAuth2SuccessHandler oAuth2SuccessHandler;

  @Value("${cors.allowed-origins}")
  private String allowedOrigins;

  @Bean
  PasswordEncoder passwordEncoder() {
    return PasswordEncoderFactories.createDelegatingPasswordEncoder();
  }

  // JWT 필터는 여기서 생성
  @Bean
  public JwtAuthenticationFilter jwtAuthenticationFilter() {
    return new JwtAuthenticationFilter(jwtTokenProvider, userSessionStore);
  }

  // JwtAuthenticationFilter가 "서블릿 필터로 자동 등록"되는 걸 막기
  // (이중 등록되면 StackOverflowError 터질 수 있음)
  @Bean
  public FilterRegistrationBean<JwtAuthenticationFilter> jwtFilterRegistration(
      JwtAuthenticationFilter filter) {
    FilterRegistrationBean<JwtAuthenticationFilter> reg = new FilterRegistrationBean<>(filter);
    reg.setEnabled(false);
    return reg;
  }

  @Bean
  public SecurityFilterChain securityFilterChain(
      HttpSecurity http, JwtAuthenticationFilter jwtAuthenticationFilter) throws Exception {
    http.cors(
            (cors) ->
                cors.configurationSource(corsConfigurationSource())) // 다른 도메인(프론트 5173)에서 요청 허용
        .csrf(AbstractHttpConfigurer::disable) // CSRF 보호 끄기 (JWT 쓰니까 불필요)
        .sessionManagement(
            (session) ->
                session.sessionCreationPolicy(
                    SessionCreationPolicy.STATELESS)) // 세션 안 씀 (JWT로 인증하니까)
        // [CORS Fix] 401 에러 시 /login으로 리다이렉트되지 않고 그냥 401 반환하도록 설정
        // 인증 안 된 요청이 오면 로그인 페이지로 리다이렉트하지 말고
        // 그냥 401 상태코드만 반환해라
        .exceptionHandling(
            (e) ->
                e.authenticationEntryPoint(
                    new org.springframework.security.web.authentication.HttpStatusEntryPoint(
                        org.springframework.http.HttpStatus.UNAUTHORIZED)))
        .authorizeHttpRequests(
            (auth) ->
                auth.requestMatchers(HttpMethod.OPTIONS, "/**")
                    .permitAll()
                    // 이 경로들은 토큰 없이도 접근 가능
                    .requestMatchers(
                        "/api/member/join",
                        "/api/member/login",
                        "/api/member/check-nickname",
                        "/api/member/check-email",
                        "/api/member/send-code",
                        "/api/member/send-registration-code",
                        "/api/member/verify-code",
                        "/api/member/reset-password",
                        "/api/notices",
                        "/api/notices/**",
                        "/api/games/leave" // 추가: sendBeacon용 (내부에서 토큰 직접 검증)
                        )
                    .permitAll()
                    // OAuth2 로그인 관련 경로도 토큰 없이 접근 가능
                    .requestMatchers("/oauth2/**", "/login/oauth2/**")
                    .permitAll()
                    // WebSocket 엔드포인트도 열어둠
                    .requestMatchers("/ws/**", "/uploads/**")
                    .permitAll()
                    // /api/member/me는 반드시 토큰 필요
                    .requestMatchers("/api/member/me")
                    .authenticated()
                    // 나머지 전부 토큰 필요
                    .anyRequest()
                    .authenticated())
        // OAuth2 로그인 설정
        .oauth2Login(
            (oauth2) ->
                oauth2
                    // 소셜 로그인 성공 후 사용자 정보를 가져오는 서비스 설정 (DB 저장 등)
                    .userInfoEndpoint((userInfo) -> userInfo.userService(customOAuth2UserService))
                    // 로그인 성공 시 JWT 발급 및 프론트엔드 리다이렉트 처리
                    .successHandler(oAuth2SuccessHandler))
        // JWT 인증 필터를 UsernamePasswordAuthenticationFilter 앞에 배치
        // 시큐리티 체인에서만 1번 돌게 한다
        .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
    // 모든 요청이 들어오면 JWT 필터를 먼저 실행해서 토큰 검증
    return http.build();
  }

  @Bean
  public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration configuration = new CorsConfiguration();
    configuration.setAllowedOrigins(Arrays.asList(allowedOrigins.split(",")));
    configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
    configuration.setAllowedHeaders(Arrays.asList("*"));
    configuration.setAllowCredentials(true);

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", configuration);
    return source;
  }
}
