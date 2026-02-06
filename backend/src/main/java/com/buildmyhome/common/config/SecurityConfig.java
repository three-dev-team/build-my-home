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
  public FilterRegistrationBean<JwtAuthenticationFilter> jwtFilterRegistration(JwtAuthenticationFilter filter) {
    FilterRegistrationBean<JwtAuthenticationFilter> reg = new FilterRegistrationBean<>(filter);
    reg.setEnabled(false);
    return reg;
  }

  @Bean
  public SecurityFilterChain securityFilterChain(HttpSecurity http, JwtAuthenticationFilter jwtAuthenticationFilter)
    throws Exception {
    http
      .cors((cors) -> cors.configurationSource(corsConfigurationSource()))
      .csrf(AbstractHttpConfigurer::disable)
      // 세션을 사용하지 않으므로 STATELESS 설정
      // 세션을 사용하지 않으므로 STATELESS 설정
      .sessionManagement((session) -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
      // [CORS Fix] 401 에러 시 /login으로 리다이렉트되지 않고 그냥 401 반환하도록 설정
      .exceptionHandling((e) ->
        e.authenticationEntryPoint(
          new org.springframework.security.web.authentication.HttpStatusEntryPoint(
            org.springframework.http.HttpStatus.UNAUTHORIZED
          )
        )
      )
      .authorizeHttpRequests((auth) ->
        auth
          .requestMatchers(HttpMethod.OPTIONS, "/**")
          .permitAll()
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
          )
          .permitAll()
          // OAuth2 로그인 관련 경로
          .requestMatchers("/oauth2/**", "/login/oauth2/**")
          .permitAll()
          .requestMatchers("/ws/**", "/uploads/**")
          .permitAll()
          // 내 정보 조회는 인증 필수
          .requestMatchers("/api/member/me")
          .authenticated()
          // 그 외 모든 요청은 인증 필수
          .anyRequest()
          .authenticated()
      )
      // OAuth2 로그인 설정
      .oauth2Login((oauth2) ->
        oauth2
          // 소셜 로그인 성공 후 사용자 정보를 가져오는 서비스 설정 (DB 저장 등)
          .userInfoEndpoint((userInfo) -> userInfo.userService(customOAuth2UserService))
          // 로그인 성공 시 JWT 발급 및 프론트엔드 리다이렉트 처리
          .successHandler(oAuth2SuccessHandler)
      )
      // JWT 인증 필터를 UsernamePasswordAuthenticationFilter 앞에 배치
      // 시큐리티 체인에서만 1번 돌게 한다
      .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

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
