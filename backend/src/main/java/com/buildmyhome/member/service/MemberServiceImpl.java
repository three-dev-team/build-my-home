package com.buildmyhome.member.service;

import com.buildmyhome.common.jwt.JwtTokenProvider;
import com.buildmyhome.member.dto.JoinRequest;
import com.buildmyhome.member.dto.LoginRequest;
import com.buildmyhome.member.dto.MemberResponse;
import com.buildmyhome.member.entity.Member;
import com.buildmyhome.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MemberServiceImpl implements MemberService {
    private final MemberRepository memberRepository;
    private final JwtTokenProvider jwtTokenProvider; // JWT 생성 클래스
    private final PasswordEncoder passwordEncoder;  // 비밀번호 암호화

    @Override
    @Transactional
    public void join(JoinRequest dto) {
        Member member = Member.builder()
                .email(dto.getEmail())
                .password(passwordEncoder.encode(dto.getPassword())) // 암호화 필수
                .nickname(dto.getNickname())
                .build();
        memberRepository.save(member);
    }

    @Override
    public boolean existsByNickname(String nickname) {
        return memberRepository.existsByNickname(nickname);
    }

    @Override
    public MemberResponse getMemberInfo(String email) {
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("해당 주민을 찾을 수 없습니다."));

        return MemberResponse.builder()
                .email(member.getEmail())
                .nickname(member.getNickname())
                .bell(member.getBell())
                .level(member.getLevel())
                .build();
    }

    //    @Override
//    public MemberResponse login(LoginRequest dto) {
//        Member member = memberRepository.findByEmail(dto.getEmail())
//                .orElseThrow(() -> new RuntimeException("가입되지 않은 이메일입니다."));
//
//        if (!passwordEncoder.matches(dto.getPassword(), member.getPassword())) {
//            throw new RuntimeException("비밀번호가 일치하지 않습니다.");
//        }
//
//        String token = jwtTokenProvider.createToken(member.getEmail());
//
//        return MemberResponse.builder()
//                .token(token)
//                .email(member.getEmail())
//                .nickname(member.getNickname())
//                .level(member.getLevel())
//                .bell(member.getBell())
//                .build();
//    }
@Override
public MemberResponse login(LoginRequest loginRequest) {
    // 1. 이메일로 회원 조회
    Member member = memberRepository.findByEmail(loginRequest.getEmail())
            .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사용자입니다. 📧"));

    // 2. 비밀번호 일치 여부 확인
    if (!passwordEncoder.matches(loginRequest.getPassword(), member.getPassword())) {
        throw new IllegalArgumentException("비밀번호가 일치하지 않습니다. 🔑");
    }

    // 3. JWT 토큰 생성
    String token = jwtTokenProvider.createToken(member.getEmail(), member.getRole().name());

    // 4. 응답 객체 생성 및 반환
    return MemberResponse.builder()
            .token(token)
            .email(member.getEmail())
            .nickname(member.getNickname())
            .level(member.getLevel())
            .bell(member.getBell())
            .playCount(member.getPlayCount())
            .build();
}
}
