package com.buildmyhome.common.security.service;

import com.buildmyhome.member.entity.Member;
import com.buildmyhome.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final MemberRepository memberRepository;

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);
        String provider = userRequest.getClientRegistration().getRegistrationId();

        Map<String, Object> attributes = oAuth2User.getAttributes();
        String email = extractEmail(provider, attributes);
        String nickname = extractNickname(provider, attributes);

        // 1. 이미 가입된 이메일인지 확인
        memberRepository.findByEmail(email)
                .orElseGet(() -> {
                    // 2. 닉네임 중복 체크 및 고유 닉네임 생성
                    String finalNickname = nickname;

                    // 중복된 닉네임이 존재한다면 랜덤 문자 등을 붙여서 유일하게 만듭니다.
                    // My 페이지에서 이름 변경이 가능하므로 초기값은 겹치지 않게 설정합니다.
                    if (memberRepository.existsByNickname(finalNickname)) {
                        finalNickname = nickname + "_" + UUID.randomUUID().toString().substring(0, 5);
                    }

                    return memberRepository.save(
                            Member.builder()
                                    .email(email)
                                    .nickname(finalNickname) // 생성된 고유 닉네임 사용
                                    .password("")
                                    .role(Member.Role.MEMBER)
                                    .bell(0)
                                    .level(1)
                                    .build()
                    );
                });

        return oAuth2User;
    }

    private String extractEmail(String provider, Map<String, Object> attributes) {
        if (provider.equals("google")) return (String) attributes.get("email");

        if (provider.equals("naver")) {
            Map<String, Object> response = (Map<String, Object>) attributes.get("response");
            if (response == null) {
                throw new OAuth2AuthenticationException("네이버로부터 정보를 가져올 수 없습니다.");
            }
            return (String) response.get("email");
        }

        if (provider.equals("kakao")) {
            Map<String, Object> kakaoAccount = (Map<String, Object>) attributes.get("kakao_account");
            return (String) (kakaoAccount != null ? kakaoAccount.get("email") : null);
        }

        if (provider.equals("github")) return (String) attributes.get("email");

        return null; // extractEmail 수정
    }

    private String extractNickname(String provider, Map<String, Object> attributes) {
        if (provider.equals("google")) return (String) attributes.get("name");

        if (provider.equals("naver")) {
            Map<String, Object> response = (Map<String, Object>) attributes.get("response");
            if (response != null) {
                // 네이버는 nickname 필드가 비어있을 수 있으므로 name 필드를 차선책으로 사용합니다.
                String navNickname = (String) response.get("nickname");
                if (navNickname == null || navNickname.isEmpty()) {
                    navNickname = (String) response.get("name");
                }
                return (navNickname != null) ? navNickname : "네이버주민";
            }
        }

        if (provider.equals("github")) return (String) attributes.get("login");

        if (provider.equals("kakao")) {
            Map<String, Object> kakaoAccount = (Map<String, Object>) attributes.get("kakao_account");
            if (kakaoAccount != null) {
                Map<String, Object> profile = (Map<String, Object>) kakaoAccount.get("profile");
                return (String) (profile != null ? profile.get("nickname") : "카카오주민");
            }
        }

        return "새로운주민"; // 모든 경우 실패 시 기본값
    }
}