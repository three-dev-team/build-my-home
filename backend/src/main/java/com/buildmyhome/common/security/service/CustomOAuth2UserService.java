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
        String socialId = extractSocialId(provider, attributes); // 메서드 추가 필요

        // 1. 소셜 ID로 먼저 가입 여부 확인 (연동된 계정이 있는지?)
        Member member = null;
        if ("kakao".equals(provider)) member = memberRepository.findByKakaoId(socialId).orElse(null);
        else if ("naver".equals(provider)) member = memberRepository.findByNaverId(socialId).orElse(null);
        else if ("google".equals(provider)) member = memberRepository.findByGoogleId(socialId).orElse(null);

        if (member == null) {
            // 2. 소셜 ID로 없다면 이메일로 확인 (이메일이 있는 경우에만)
            if (email != null) {
                member = memberRepository.findByEmail(email).orElse(null);
            }
        }

        if (member != null) {
            // 이미 존재하는 유저라면, 현재 로그인한 소셜 계정 정보를 업데이트 (자동 연동/마이그레이션)
            boolean isUpdated = false;
            if ("kakao".equals(provider) && member.getKakaoId() == null) {
                member.setKakaoId(socialId);
                isUpdated = true;
            } else if ("naver".equals(provider) && member.getNaverId() == null) {
                member.setNaverId(socialId);
                isUpdated = true;
            } else if ("google".equals(provider) && member.getGoogleId() == null) {
                member.setGoogleId(socialId);
                isUpdated = true;
            }

            if (isUpdated) {
                memberRepository.save(member);
            }
        }

        if (member == null) {
            // 3. 아예 없다면 회원가입 진행
             // 닉네임 중복 체크 및 고유 닉네임 생성
            String finalNickname = nickname;

            // 중복된 닉네임이 존재한다면 랜덤 문자 등을 붙여서 유일하게 만듭니다.
            if (memberRepository.existsByNickname(finalNickname)) {
                finalNickname = nickname + "_" + UUID.randomUUID().toString().substring(0, 5);
            }

            // 이메일이 없는 경우 (카카오 등 권한 문제) 가짜 이메일 생성
            String finalEmail = email;
            if (finalEmail == null) {
                finalEmail = provider + "_" + socialId + "@social.kakao"; // 예: kakao_12345@social.kakao
            }

            member = Member.builder()
                    .email(finalEmail)
                    .nickname(finalNickname)
                    .password("")
                    .role(Member.Role.MEMBER)
                    .bell(0)
                    .level(1)
                    .build();
            
            // 가입 시점의 소셜 ID 저장
            if ("kakao".equals(provider)) member.setKakaoId(socialId);
            else if ("naver".equals(provider)) member.setNaverId(socialId);
            else if ("google".equals(provider)) member.setGoogleId(socialId);
            
            memberRepository.save(member);
        }

        return oAuth2User;
    }
    
    private String extractSocialId(String provider, Map<String, Object> attributes) {
        if (provider.equals("kakao")) return String.valueOf(attributes.get("id"));
        if (provider.equals("naver")) {
             Map<String, Object> response = (Map<String, Object>) attributes.get("response");
             return (String) response.get("id");
        }
        if (provider.equals("google")) return (String) attributes.get("sub");
        if (provider.equals("github")) return String.valueOf(attributes.get("id"));
        return null;
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