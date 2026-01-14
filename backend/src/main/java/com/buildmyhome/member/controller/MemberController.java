package com.buildmyhome.member.controller;

import com.buildmyhome.member.dto.*;
import com.buildmyhome.member.service.MemberService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/member")
@RequiredArgsConstructor
public class MemberController {

    private final MemberService memberService;

    @PostMapping("/join")
    public ResponseEntity<Void> join(@RequestBody JoinRequest dto) {
        memberService.join(dto);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @PostMapping("/login")
    public ResponseEntity<MemberResponse> login(@RequestBody LoginRequest loginRequest) {
        return ResponseEntity.ok(memberService.login(loginRequest));
    }

    @GetMapping("/check-nickname")
    public ResponseEntity<Boolean> checkNickname(@RequestParam String nickname) {
        return ResponseEntity.ok(!memberService.existsByNickname(nickname));
    }

    @PostMapping("/send-registration-code")
    public ResponseEntity<String> sendRegistrationCode(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        if (memberService.existsByEmail(email)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("이미 가입된 이메일입니다. 😢");
        }
        memberService.sendRegistrationCode(email);
        return ResponseEntity.ok("인증번호가 발송되었습니다.");
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
            @RequestBody NickNameUpdateDto dto,
            Authentication authentication) {

        String email = authentication.getName(); // 토큰에서 이메일 추출

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
}