package com.buildmyhome.common.jwt;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

  private final JwtTokenProvider jwtTokenProvider;
  private final com.buildmyhome.common.jwt.UserSessionStore userSessionStore;

  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) throws ServletException {
    String path = request.getRequestURI();
    return path.startsWith("/ws");
  }

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
    throws ServletException, IOException {
    String token = resolveToken(request);

    // 토큰이 있고, 유효하며, 최신 토큰인 경우에만 인증 설정
    if (token != null && jwtTokenProvider.validateToken(token)) {
      // [중복 로그인 체크]
      Long memberId = jwtTokenProvider.getMemberId(token);
      if (userSessionStore.isLatestToken(memberId, token)) {
        // 최신 토큰이면 인증 처리
        String email = jwtTokenProvider.getEmail(token);

        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
          email,
          null,
          List.of(new SimpleGrantedAuthority("ROLE_MEMBER"))
        );
        // DeferredContext 꼬임 방지: 새 컨텍스트 만들어 세팅
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(auth);
        SecurityContextHolder.setContext(context);
      }
      // 최신 토큰이 아니면 인증 설정하지 않음 (unauthenticated로 진행)
      // permitAll() 엔드포인트는 접근 가능, authenticated() 엔드포인트는 Spring Security가 403/401 반환
    }
    filterChain.doFilter(request, response);
  }

  private String resolveToken(HttpServletRequest request) {
    String bearer = request.getHeader("Authorization");
    if (bearer != null && bearer.startsWith("Bearer ")) {
      return bearer.substring(7);
    }
    return null;
  }
}
