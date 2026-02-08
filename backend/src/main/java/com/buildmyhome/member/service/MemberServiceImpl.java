package com.buildmyhome.member.service;

import com.buildmyhome.common.jwt.JwtTokenProvider;
import com.buildmyhome.member.dto.*;
import com.buildmyhome.member.entity.Member;
import com.buildmyhome.member.repository.MemberRepository;
import com.buildmyhome.member.storage.VerificationStorage;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.util.Random;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class MemberServiceImpl implements MemberService {

  private final MemberRepository memberRepository;
  private final JwtTokenProvider jwtTokenProvider;
  private final PasswordEncoder passwordEncoder;
  private final VerificationStorage verificationStorage;
  private final JavaMailSender mailSender;
  private final com.buildmyhome.common.jwt.UserSessionStore userSessionStore;

  @Override
  @Transactional
  public void join(JoinRequest dto) {
    if (memberRepository.existsByEmail(dto.getEmail())) {
      throw new RuntimeException("이미 존재하는 주민입니다.");
    }
    Member member = Member.builder()
      .email(dto.getEmail())
      .password(passwordEncoder.encode(dto.getPassword()))
      .nickname(dto.getNickname().trim())
      .level(1)
      .bell(0)
      .playCount(0)
      .build();
    memberRepository.save(member);
  }

  @Override
  @Transactional
  public MemberResponse login(LoginRequest loginRequest) {
    Member member = memberRepository
      .findByEmail(loginRequest.getEmail())
      .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 사용자입니다."));

    if (!passwordEncoder.matches(loginRequest.getPassword(), member.getPassword())) {
      throw new IllegalArgumentException("비밀번호가 일치하지 않습니다.");
    }

    // 정지 시간이 지났으면 자동 해제
    if (Boolean.TRUE.equals(member.getIsSuspended())) {
      if (member.getSuspendedUntil() != null && member.getSuspendedUntil().isBefore(java.time.LocalDateTime.now())) {
        member.setIsSuspended(false);
        member.setSuspendedUntil(null);
      }
    }

    // 마지막 로그인 시간 갱신
    java.time.LocalDateTime now = java.time.LocalDateTime.now();
    member.setLastLoginAt(now);
    member.setIsOnline(true);

    String token = jwtTokenProvider.createToken(member.getEmail(), member.getRole().name(), member.getId(), now);
    userSessionStore.registerToken(member.getId(), token);

    return MemberResponse.builder()
      .id(member.getId())
      .token(token)
      .email(member.getEmail())
      .nickname(member.getNickname())
      .level(member.getLevel())
      .bell(member.getBell())
      .playCount(member.getPlayCount())
      .role(member.getRole().name())
      .kakaoId(member.getKakaoId())
      .naverId(member.getNaverId())
      .googleId(member.getGoogleId())
      .profileImage(member.getProfileImage())
      .isSuspended(member.getIsSuspended())
      .suspendedUntil(member.getSuspendedUntil())
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
      .id(member.getId())
      .email(member.getEmail())
      .nickname(member.getNickname())
      .level(member.getLevel())
      .bell(member.getBell())
      .role(member.getRole().name())
      .kakaoId(member.getKakaoId())
      .naverId(member.getNaverId())
      .googleId(member.getGoogleId())
      .profileImage(member.getProfileImage())
      .createdAt(member.getCreatedAt())
      .build();
  }

  @Override
  public boolean existsByEmail(String email) {
    return memberRepository.existsByEmail(email);
  }

  @Override
  public boolean existsDeletedByEmail(String email) {
    return memberRepository.findDeletedByEmail(email).isPresent();
  }

  @Override
  @Transactional
  public void restoreAccount(String email, String password, String nickname) {
    Member member = memberRepository.findDeletedByEmail(email)
        .orElseThrow(() -> new IllegalArgumentException("탈퇴한 계정을 찾을 수 없습니다."));
    member.setIsDel("N");
    member.setDeletedAt(null);
    member.setPassword(passwordEncoder.encode(password));
    member.setNickname(nickname.trim());
    member.setIsSuspended(false);
    member.setSuspendedUntil(null);
    member.setWarningCount(0);
    log.info("계정 복구 완료: {}", email);
  }

  @Override
  @Transactional
  public void hardDeleteAndRejoin(JoinRequest dto) {
    // 탈퇴한 계정 조회 (member_id 확인용)
    Member deleted = memberRepository.findDeletedByEmail(dto.getEmail())
        .orElseThrow(() -> new IllegalArgumentException("탈퇴한 계정을 찾을 수 없습니다."));
    Long memberId = deleted.getId();

    // FK 제약조건 해결: answers → inquiries → member 순서로 삭제
    memberRepository.hardDeleteAnswersByMemberId(memberId);
    memberRepository.hardDeleteInquiriesByMemberId(memberId);
    memberRepository.hardDeleteByEmail(dto.getEmail());

    Member member = Member.builder()
        .email(dto.getEmail())
        .password(passwordEncoder.encode(dto.getPassword()))
        .nickname(dto.getNickname().trim())
        .level(1)
        .bell(0)
        .playCount(0)
        .build();
    memberRepository.save(member);
    log.info("계정 하드 삭제 후 재가입 완료: {}", dto.getEmail());
  }

  @Override
  @Transactional
  public void updateNickname(String email, String newNickname) {
    // 1. 중복 체크
    if (memberRepository.existsByNickname(newNickname.trim())) {
      throw new IllegalStateException("이미 사용 중인 닉네임입니다.");
    }

    // 2. 유저 조회 및 업데이트
    Member member = memberRepository
      .findByEmail(email)
      .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

    member.setNickname(newNickname.trim());
    // @Transactional이 걸려있으면 save()를 안 써도 메서드 종료 시 DB에 반영됩니다(더티 체킹).
  }

  @Override
  public boolean existsByNickname(String nickname) {
    return memberRepository.existsByNickname(nickname.trim());
  }

  private String generateCode() {
    return String.format("%06d", new Random().nextInt(1000000));
  }

  private void sendEmail(String toEmail, String code, String subject) {
    MimeMessage message = mailSender.createMimeMessage();
    try {
      MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
      helper.setTo(toEmail);
      helper.setSubject(subject);
      String html =
        "<div style='background-color:#fdf6e3; padding:40px; border:4px solid #8b5a2b; border-radius:20px; text-align:center;'>" +
        "<h2 style='color:#8b5a2b;'>마을회관 인증번호</h2>" +
        "<h1 style='color:#5d4037; letter-spacing:5px;'>" +
        code +
        "</h1>" +
        "</div>";
      helper.setText(html, true);
      mailSender.send(message);
    } catch (MessagingException e) {
      log.error("메일 발송 에러: {}", e.getMessage());
      throw new RuntimeException("메일 발송 실패");
    }
  }

  @Override
  @Transactional
  public void withdraw(String email) {
    // 1. 유저 존재 여부 확인
    Member member = memberRepository
      .findByEmail(email)
      .orElseThrow(() -> new IllegalArgumentException("해당 주민을 찾을 수 없습니다."));

    // 2. [주의] 연관 데이터 처리
    // 여기서 해당 유저가 작성한 문의사항을 먼저 지워주어야 합니다.

    // 3. 유저 삭제 (Soft Delete)
    member.setIsDel("Y");
    member.setDeletedAt(java.time.LocalDateTime.now());
    // memberRepository.delete(member); // 하드 딜리트 대신 소프트 딜리트 적용

    // 더티 체킹에 의해 변경사항 자동 저장됨

    // 로그 남기기 (선택)
    log.info("회원 탈퇴 완료 (Soft Delete): {}", email);
  }

  @Override
  @Transactional
  public void unlinkSocialAccount(String email, String provider) {
    Member member = memberRepository
      .findByEmail(email)
      .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

    switch (provider.toLowerCase()) {
      case "kakao":
        member.setKakaoId(null);
        break;
      case "naver":
        member.setNaverId(null);
        break;
      case "google":
        member.setGoogleId(null);
        break;
      default:
        throw new IllegalArgumentException("지원하지 않는 소셜 서비스입니다: " + provider);
    }
    log.info("Social Account Unlinked: User={}, Provider={}", email, provider);
  }
  @Override
  @Transactional
  public MemberResponse updateProfileImage(String email, String imagePath) {
    Member member = memberRepository.findByEmail(email)
        .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));
    
    member.setProfileImage(imagePath);
    
    return MemberResponse.builder()
        .id(member.getId())
        .email(member.getEmail())
        .nickname(member.getNickname())
        .level(member.getLevel())
        .bell(member.getBell())
        .role(member.getRole().name())
        .profileImage(imagePath)
        .build();
  }

  @Override
  @Transactional
  public void logout(String email) {
    Member member = memberRepository.findByEmail(email)
        .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
    member.setIsOnline(false);
    memberRepository.save(member);
  }
}
