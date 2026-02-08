package com.buildmyhome.member.controller;

import com.buildmyhome.common.util.NicknameValidator;
import com.buildmyhome.member.dto.*;
import com.buildmyhome.member.service.MemberService;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/member")
@RequiredArgsConstructor
public class MemberController {

  private final MemberService memberService;
  private final NicknameValidator nicknameValidator; // 닉네임 유효성 검사기

  @PostMapping("/join")
  public ResponseEntity<Void> join(@RequestBody JoinRequest dto) {
    memberService.join(dto);
    return ResponseEntity.status(HttpStatus.CREATED).build();
  }

  @PostMapping("/login")
  public ResponseEntity<MemberResponse> login(@RequestBody LoginRequest loginRequest) {
    return ResponseEntity.ok(memberService.login(loginRequest));
  }

  //  @GetMapping("/check-nickname")
  //  public ResponseEntity<Boolean> checkNickname(@RequestParam String nickname) {
  //    return ResponseEntity.ok(!memberService.existsByNickname(nickname));
  //  }
  @GetMapping("/check-nickname")
  public ResponseEntity<?> checkNickname(@RequestParam String nickname) {
    NicknameValidator.ValidationResult result = nicknameValidator.validate(nickname);
    if (!result.isValid()) {
      return ResponseEntity.badRequest()
          .body(Map.of("available", false, "message", result.getMessage()));
    }

    boolean available = !memberService.existsByNickname(nickname);
    return ResponseEntity.ok(
        Map.of(
            "available", available, "message", available ? "사용 가능한 닉네임입니다." : "이미 사용 중인 닉네임입니다."));
  }

  @PostMapping("/send-registration-code")
  public ResponseEntity<?> sendRegistrationCode(@RequestBody Map<String, String> request) {
    String email = request.get("email");
    boolean force = "true".equals(request.get("force"));
    // 활성 계정 중복 체크
    if (memberService.existsByEmail(email)) {
      return ResponseEntity.status(HttpStatus.CONFLICT).body("이미 가입된 이메일입니다");
    }
    // 탈퇴 계정 체크 (force=true이면 건너뛰고 인증 메일 발송)
    if (!force && memberService.existsDeletedByEmail(email)) {
      return ResponseEntity.ok(Map.of("status", "DELETED_ACCOUNT", "message", "삭제된 계정 내역이 존재합니다"));
    }
    memberService.sendRegistrationCode(email);
    return ResponseEntity.ok(Map.of("status", "OK", "message", "인증번호가 발송되었습니다"));
  }

  // 탈퇴 계정 복구
  @PostMapping("/restore")
  public ResponseEntity<?> restoreAccount(@RequestBody Map<String, String> request) {
    try {
      memberService.restoreAccount(
          request.get("email"),
          request.get("password"),
          request.get("nickname")
      );
      return ResponseEntity.ok(Map.of("message", "계정이 복구되었습니다"));
    } catch (Exception e) {
      return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
    }
  }

  // 탈퇴 계정 완전 삭제 후 재가입
  @PostMapping("/rejoin")
  public ResponseEntity<?> rejoin(@RequestBody JoinRequest dto) {
    try {
      memberService.hardDeleteAndRejoin(dto);
      return ResponseEntity.status(HttpStatus.CREATED).build();
    } catch (Exception e) {
      e.printStackTrace();
      return ResponseEntity.badRequest().body(Map.of("message", e.getMessage() != null ? e.getMessage() : "알 수 없는 오류"));
    }
  }

  @PostMapping("/verify-code")
  public ResponseEntity<Boolean> verifyCode(@RequestBody Map<String, String> request) {
    return ResponseEntity.ok(memberService.verifyCode(request.get("email"), request.get("code")));
  }

  @PostMapping("/send-code")
  public ResponseEntity<Void> sendAuthCode(@RequestBody Map<String, String> request) {
    memberService.sendAuthCode(request.get("email"));
    return ResponseEntity.ok().build();
  }

  @PostMapping("/reset-password")
  public ResponseEntity<Void> resetPassword(@RequestBody Map<String, String> request) {
    memberService.resetPassword(request.get("email"), request.get("password"));
    return ResponseEntity.ok().build();
  }

  @GetMapping("/me")
  public ResponseEntity<MemberResponse> getCurrentMember(Authentication authentication) {
    // 1. 토큰에서 이메일 추출
    String email = authentication.getName();
    // 2. 서비스에서 유저 정보 조회
    MemberResponse response = memberService.getMemberInfo(email);
    return ResponseEntity.ok(response);
  }

  @PutMapping("/nickname")
  public ResponseEntity<?> updateNickname(
      @RequestBody NickNameUpdateDto dto, Authentication authentication) {
    String email = authentication.getName(); // 토큰에서 이메일 추출

    NicknameValidator.ValidationResult result = nicknameValidator.validate(dto.getNickname());
    if (!result.isValid()) {
      return ResponseEntity.badRequest().body(Map.of("message", result.getMessage()));
    }

    try {
      memberService.updateNickname(email, dto.getNickname());
      return ResponseEntity.ok().build();
    } catch (IllegalStateException e) {
      // 중복 시 409 Conflict 응답
      return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
    }
  }

  @DeleteMapping("/withdraw")
  public ResponseEntity<Void> withdraw(Authentication authentication) {
    // 1. 토큰 정보를 통해 현재 로그인한 유저의 이메일을 가져옵니다.
    String email = authentication.getName();

    // 2. 서비스 로직 호출
    memberService.withdraw(email);

    // 3. 성공 응답 반환
    return ResponseEntity.ok().build();
  }

  @DeleteMapping("/social/{provider}")
  public ResponseEntity<Void> unlinkSocialAccount(
      @PathVariable String provider, Authentication authentication) {
    String email = authentication.getName();
    memberService.unlinkSocialAccount(email, provider);
    return ResponseEntity.ok().build();
  }

  @PostMapping("/profile-image")
  public ResponseEntity<?> updateProfileImage(
      @RequestBody Map<String, String> body, Authentication authentication) {
    String email = authentication.getName();
    String imagePath = body.get("profileImage");
    MemberResponse response = memberService.updateProfileImage(email, imagePath);
    return ResponseEntity.ok(response);
  }

  @PostMapping("/logout")
  public ResponseEntity<Void> logout(Authentication authentication) {
    String email = authentication.getName();
    memberService.logout(email);
    return ResponseEntity.ok().build();
  }
}
