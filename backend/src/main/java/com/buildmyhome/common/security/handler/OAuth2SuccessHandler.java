package com.buildmyhome.common.security.handler;

import com.buildmyhome.common.jwt.JwtTokenProvider; // 프로젝트의 JwtTokenProvider 경로를 확인하세요
import com.buildmyhome.member.entity.Member;
import com.buildmyhome.member.repository.MemberRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

  private final JwtTokenProvider tokenProvider;
  private final MemberRepository memberRepository;
  private final com.buildmyhome.common.jwt.UserSessionStore userSessionStore;

  @Value("${app.frontBaseUrl}")
  private String frontBaseUrl;

  @Override
  public void onAuthenticationSuccess(
    HttpServletRequest request,
    HttpServletResponse response,
    Authentication authentication
  ) throws IOException {
    OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();

    // 0. 쿠키 확인 (연동 요청인지?)
    String linkMemberId = getCookieValue(request, "LINK_MEMBER_ID");

    if (linkMemberId != null && !linkMemberId.isEmpty()) {
      // [연동 로직]
      try {
        Long memberId = Long.parseLong(linkMemberId);
        Member member = memberRepository.findById(memberId).orElseThrow(() -> new RuntimeException("Member not found"));

        // 소셜 ID 추출
        String socialId = extractSocialId(oAuth2User);
        String provider = extractProvider(oAuth2User);

        // [중복 검사] 이미 다른 계정에 연동된 소셜 ID인지 확인
        Member existingSocialMember = null;
        if ("kakao".equals(provider)) existingSocialMember = memberRepository.findByKakaoId(socialId).orElse(null);
        else if ("naver".equals(provider)) existingSocialMember = memberRepository.findByNaverId(socialId).orElse(null);
        else if ("google".equals(provider)) existingSocialMember = memberRepository
          .findByGoogleId(socialId)
          .orElse(null);

        if (existingSocialMember != null && !existingSocialMember.getId().equals(member.getId())) {
          // 이미 다른 계정에 연동되어 있음 -> 실패 처리
          deleteCookie(response, "LINK_MEMBER_ID");
          getRedirectStrategy().sendRedirect(request, response, frontBaseUrl + "/mypage?linked=duplicate");
          return;
        }

        // 연동 진행
        if ("kakao".equals(provider)) member.setKakaoId(socialId);
        else if ("naver".equals(provider)) member.setNaverId(socialId);
        else if ("google".equals(provider)) member.setGoogleId(socialId);

        memberRepository.save(member);

        // 쿠키 삭제
        deleteCookie(response, "LINK_MEMBER_ID");

        // 마지막 로그인 시간 갱신
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        member.setLastLoginAt(now);
        member.setIsOnline(true);
        memberRepository.save(member);

        // 기존 토큰 재발급 (연동 후 유지)
        String token = tokenProvider.createToken(member.getEmail(), member.getRole().name(), member.getId(), now);
        userSessionStore.registerToken(member.getId(), token);

        // 마이페이지로 이동
        String targetUrl = UriComponentsBuilder.fromUriString(frontBaseUrl + "/mypage")
          .queryParam("linked", "success")
          .queryParam("token", token) // 갱신된 정보 전달용
          .build()
          .toUriString();

        getRedirectStrategy().sendRedirect(request, response, targetUrl);
        return;
      } catch (Exception e) {
        e.printStackTrace();
        // 실패 시 에러 페이지 또는 홈으로
        getRedirectStrategy().sendRedirect(request, response, frontBaseUrl + "/mypage?linked=fail");
        return;
      }
    }

    // [기존 로그인 로직]
    String socialId = extractSocialId(oAuth2User);
    String email = extractEmail(oAuth2User);

    // Provider 확인 (Authentication 객체 활용)
    String provider = "unknown";
    if (authentication instanceof org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken) {
      org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken authToken =
        (org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken) authentication;
      provider = authToken.getAuthorizedClientRegistrationId();
    } else {
      provider = extractProvider(oAuth2User); // fallback
    }

    // 2. DB에서 유저 정보 조회 (우선순위: Social ID -> Email)
    Member member = null;

    // 2-1. Social ID로 조회
    if ("kakao".equals(provider)) member = memberRepository.findByKakaoId(socialId).orElse(null);
    else if ("naver".equals(provider)) member = memberRepository.findByNaverId(socialId).orElse(null);
    else if ("google".equals(provider)) member = memberRepository.findByGoogleId(socialId).orElse(null);

    // 2-2. Email로 조회 (Social ID로 못 찾았고, 이메일이 있는 경우)
    if (member == null && email != null) {
      member = memberRepository.findByEmail(email).orElse(null);
    }

    if (member == null) {
      throw new RuntimeException("유저를 찾을 수 없습니다. (Login Failed)");
    }

    // ========== 정지 자동 해제 ==========
    if (Boolean.TRUE.equals(member.getIsSuspended())) {
      if (member.getSuspendedUntil() != null && member.getSuspendedUntil().isBefore(java.time.LocalDateTime.now())) {
        // 정지 기간이 지난 경우 자동 해제
        member.setIsSuspended(false);
        member.setSuspendedUntil(null);
      }
    }

    // 마지막 로그인 시간 갱신
    java.time.LocalDateTime now = java.time.LocalDateTime.now();
    member.setLastLoginAt(now);
    member.setIsOnline(true);
    memberRepository.save(member);

    // 3. JWT 토큰 생성
    String token = tokenProvider.createToken(member.getEmail(), member.getRole().name(), member.getId(), now);
    userSessionStore.registerToken(member.getId(), token);

    // 4. 프론트엔드로 리다이렉트할 URL 생성
    String nickname = member.getNickname();
    try {
      nickname = URLEncoder.encode(nickname, StandardCharsets.UTF_8).replaceAll("\\+", "%20");
    } catch (Exception e) {
      nickname = "Unknown";
    }

    UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(frontBaseUrl + "/oauth2/redirect")
      .queryParam("token", token)
      .queryParam("nickname", nickname)
      .queryParam("bell", member.getBell())
      .queryParam("level", member.getLevel())
      .queryParam("profileImage", member.getProfileImage() != null ? member.getProfileImage() : "");
    
    // 정지 정보 전달
    if (Boolean.TRUE.equals(member.getIsSuspended())) {
      builder.queryParam("isSuspended", "true");
      if (member.getSuspendedUntil() != null) {
        builder.queryParam("suspendedUntil", member.getSuspendedUntil().toString());
      }
    }
    
    String targetUrl = builder.build().toUriString();

    // 5. 리다이렉트 실행
    getRedirectStrategy().sendRedirect(request, response, targetUrl);
  }

  // 쿠키 유틸 메서드
  private String getCookieValue(HttpServletRequest request, String name) {
    if (request.getCookies() == null) return null;
    for (jakarta.servlet.http.Cookie cookie : request.getCookies()) {
      if (cookie.getName().equals(name)) return cookie.getValue();
    }
    return null;
  }

  private void deleteCookie(HttpServletResponse response, String name) {
    jakarta.servlet.http.Cookie cookie = new jakarta.servlet.http.Cookie(name, null);
    cookie.setPath("/");
    cookie.setMaxAge(0);
    response.addCookie(cookie);
  }

  // ID 추출
  private String extractSocialId(OAuth2User oAuth2User) {
    Map<String, Object> attributes = oAuth2User.getAttributes();
    if (attributes.containsKey("id")) return String.valueOf(attributes.get("id")); // 카카오, 깃허브
    if (attributes.containsKey("sub")) return (String) attributes.get("sub"); // 구글
    if (attributes.containsKey("response")) {
      Object response = attributes.get("response");
      if (response instanceof Map) {
        return (String) ((Map) response).get("id"); // 네이버
      }
    }
    return null;
  }

  private String extractProvider(OAuth2User oAuth2User) {
    Map<String, Object> attributes = oAuth2User.getAttributes();
    if (attributes.containsKey("kakao_account")) return "kakao";
    if (attributes.containsKey("response")) return "naver";
    if (attributes.containsKey("sub")) return "google";
    return "unknown";
  }

  private String extractEmail(OAuth2User oAuth2User) {
    Map<String, Object> attributes = oAuth2User.getAttributes();

    // 구글
    if (attributes.containsKey("email")) {
      return (String) attributes.get("email");
    }
    // 네이버
    if (attributes.containsKey("response")) {
      return (String) ((Map) attributes.get("response")).get("email");
    }
    // 카카오
    if (attributes.containsKey("kakao_account")) {
      return (String) ((Map) attributes.get("kakao_account")).get("email");
    }

    return oAuth2User.getName();
  }
}
