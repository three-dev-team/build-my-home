package com.buildmyhome.member.controller;

import com.buildmyhome.member.dto.*;
import com.buildmyhome.member.service.MemberService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
}