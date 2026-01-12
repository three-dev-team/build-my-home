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
                    // 중복된 닉네임이 존재한다면 랜덤 숫자 등을 붙여서 유일하게 만듭니다.
                    if (memberRepository.existsByNickname(finalNickname)) {
                        finalNickname = nickname + "_" + java.util.UUID.randomUUID().toString().substring(0, 5);
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

//    private String extractEmail(String provider, Map<String, Object> attributes) {
//        if (provider.equals("google")) return (String) attributes.get("email");
//        if (provider.equals("naver")) return (String) ((Map) attributes.get("response")).get("email");
//        if (provider.equals("kakao")) return (String) ((Map) attributes.get("kakao_account")).get("email");
//        return null;
//    }
//
//    private String extractNickname(String provider, Map<String, Object> attributes) {
//        if (provider.equals("google")) return (String) attributes.get("name");
//        if (provider.equals("naver")) return (String) ((Map) attributes.get("response")).get("nickname");
//        if (provider.equals("kakao")) return (String) ((Map) ((Map) attributes.get("kakao_account")).get("profile")).get("nickname");
//        return "새로운 주민";
//    }

    private String extractEmail(String provider, Map<String, Object> attributes) {
        if (provider.equals("google")) return (String) attributes.get("email");

        if (provider.equals("naver")) {
            // response 맵을 먼저 안전하게 꺼냅니다.
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

        return null;// extractEmail 수정
    }

    private String extractNickname(String provider, Map<String, Object> attributes) {
        if (provider.equals("google")) return (String) attributes.get("name");

        if (provider.equals("naver")) {
            Map<String, Object> response = (Map<String, Object>) attributes.get("response");
            // 네이버 닉네임이 없으면 '새로운 주민'으로 대체
            String navNickname = (response != null) ? (String) response.get("nickname") : null;
            return (navNickname != null) ? navNickname : "네이버 주민";
        }
        // extractNickname 수정
        if (provider.equals("github")) return (String) attributes.get("login");

        if (provider.equals("kakao")) {
            Map<String, Object> kakaoAccount = (Map<String, Object>) attributes.get("kakao_account");
            if (kakaoAccount != null) {
                Map<String, Object> profile = (Map<String, Object>) kakaoAccount.get("profile");
                return (String) (profile != null ? profile.get("nickname") : "카카오 주민");
            }
        }
        return "새로운 주민";
    }
}