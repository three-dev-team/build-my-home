package com.buildmyhome.common.security.handler;

import com.buildmyhome.common.jwt.JwtTokenProvider; // 프로젝트의 JwtTokenProvider 경로를 확인하세요
import com.buildmyhome.member.entity.Member;
import com.buildmyhome.member.repository.MemberRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final JwtTokenProvider tokenProvider;
    private final MemberRepository memberRepository;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException {

        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();

        // 1. 소셜 서비스로부터 이메일 추출
        String email = extractEmail(oAuth2User);

        // OAuth2SuccessHandler.java의 41라인 근처 수정

// 2. DB에서 유저 정보 조회 (member 객체는 이미 위에서 가져온 상태여야 함)
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("유저를 찾을 수 없습니다."));

// 3. JWT 토큰 생성 (인자를 두 개 전달하도록 수정)
// member.getRole().name() 또는 프로젝트 설정에 따라 "ROLE_MEMBER" 형태가 필요할 수 있습니다.
        String token = tokenProvider.createToken(member.getEmail(), member.getRole().name());


        // 4. 프론트엔드로 리다이렉트할 URL 생성
        // 파라미터에 토큰, 닉네임, 벨, 레벨을 담아 보냅니다 (기존 로그인 로직과 통일)
//        String targetUrl = UriComponentsBuilder.fromUriString("http://localhost:3000/oauth2/redirect")
//                .queryParam("token", token)
//                .queryParam("nickname", URLEncoder.encode(member.getNickname(), StandardCharsets.UTF_8))
//                .queryParam("bell", member.getBell())
//                .queryParam("level", member.getLevel())
//                .build().toUriString();

        // OAuth2SuccessHandler.java 내 리다이렉트 부분
        String targetUrl = UriComponentsBuilder.fromUriString("http://localhost:8088/oauth2/redirect") // 3000 -> 5173으로 수정
                .queryParam("token", token)
                .queryParam("nickname", URLEncoder.encode(member.getNickname(), StandardCharsets.UTF_8))
                .queryParam("bell", member.getBell())
                .queryParam("level", member.getLevel())
                .build().toUriString();

        // 5. 리다이렉트 실행
        getRedirectStrategy().sendRedirect(request, response, targetUrl);
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