package com.buildmyhome.member.service;

import com.buildmyhome.common.jwt.JwtTokenProvider;
import com.buildmyhome.member.dto.*;
import com.buildmyhome.member.entity.Member;
import com.buildmyhome.member.repository.MemberRepository;
import com.buildmyhome.member.storage.VerificationStorage;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Random;

@Slf4j
@Service
@RequiredArgsConstructor
public class MemberServiceImpl implements MemberService {

    private final MemberRepository memberRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;
    private final VerificationStorage verificationStorage;
    private final JavaMailSender mailSender;

    @Override
    @Transactional
    public void join(JoinRequest dto) {
        if (memberRepository.existsByEmail(dto.getEmail())) {
            throw new RuntimeException("이미 존재하는 주민입니다.");
        }
        Member member = Member.builder()
                .email(dto.getEmail())
                .password(passwordEncoder.encode(dto.getPassword()))
                .nickname(dto.getNickname())
                .level(1).bell(0).playCount(0)
                .build();
        memberRepository.save(member);
    }

    @Override
    @Transactional(readOnly = true)
    public MemberResponse login(LoginRequest loginRequest) {
        Member member = memberRepository.findByEmail(loginRequest.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사용자입니다."));

        if (!passwordEncoder.matches(loginRequest.getPassword(), member.getPassword())) {
            throw new IllegalArgumentException("비밀번호가 일치하지 않습니다.");
        }

        String token = jwtTokenProvider.createToken(member.getEmail(), "USER", member.getId());

        return MemberResponse.builder()
                .token(token).email(member.getEmail()).nickname(member.getNickname())
                .level(member.getLevel()).bell(member.getBell()).playCount(member.getPlayCount())
                .build();
    }

    @Override
    public void sendRegistrationCode(String email) {
        String code = generateCode();
        verificationStorage.save(email, code, 300); // 5분 유효
        sendEmail(email, code, "[지어봐요 마이홈] 주민 등록 인증번호입니다. 🍃");
    }

    @Override
    public void sendAuthCode(String email) {
        memberRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("가입되지 않은 이메일입니다."));
        String code = generateCode();
        verificationStorage.save(email, code, 300);
        sendEmail(email, code, "[지어봐요 마이홈] 비밀번호 재설정 인증번호입니다. 🕊️");
    }

    @Override
    public boolean verifyCode(String email, String code) {
        String storedCode = verificationStorage.get(email);
        return storedCode != null && storedCode.equals(code);
    }

    @Override
    @Transactional
    public void resetPassword(String email, String newPassword) {
        Member member = memberRepository.findByEmail(email).orElseThrow();
        member.setPassword(passwordEncoder.encode(newPassword));
        verificationStorage.remove(email);
        log.info("주민 비밀번호 변경 완료: {}", email);
    }

    @Override
    public MemberResponse getMemberInfo(String email) {
        Member member = memberRepository.findByEmail(email).orElseThrow();
        return MemberResponse.builder()
                .email(member.getEmail()).nickname(member.getNickname())
                .level(member.getLevel()).bell(member.getBell())
                .build();
    }

    @Override
    public boolean existsByEmail(String email) { return memberRepository.existsByEmail(email); }

    @Override
    public boolean existsByNickname(String nickname) { return memberRepository.existsByNickname(nickname); }

    private String generateCode() { return String.format("%06d", new Random().nextInt(1000000)); }

    private void sendEmail(String toEmail, String code, String subject) {
        MimeMessage message = mailSender.createMimeMessage();
        try {
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(toEmail);
            helper.setSubject(subject);
            String html = "<div style='background-color:#fdf6e3; padding:40px; border:4px solid #8b5a2b; border-radius:20px; text-align:center;'>"
                    + "<h2 style='color:#8b5a2b;'>마을회관 인증번호</h2>"
                    + "<h1 style='color:#5d4037; letter-spacing:5px;'>" + code + "</h1>"
                    + "</div>";
            helper.setText(html, true);
            mailSender.send(message);
        } catch (MessagingException e) {
            log.error("메일 발송 에러: {}", e.getMessage());
            throw new RuntimeException("메일 발송 실패");
        }
    }
}