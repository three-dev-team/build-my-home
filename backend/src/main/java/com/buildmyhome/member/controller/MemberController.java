package com.buildmyhome.member.controller;

import com.buildmyhome.member.dto.JoinRequest;
import com.buildmyhome.member.dto.LoginRequest;
import com.buildmyhome.member.dto.MemberResponse;
import com.buildmyhome.member.service.MemberService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/member")
public class MemberController {
    private final MemberService memberService;

    // 닉네임 중복 체크 메서드
    @GetMapping("/check-nickname")
    public ResponseEntity<Boolean> checkNickname(@RequestParam("nickname") String nickname) {
        // 서비스에서 중복 여부를 확인 (중복이 아니면 true 반환)
        boolean isAvailable = !memberService.existsByNickname(nickname);
        return ResponseEntity.ok(isAvailable);
    }

    @PostMapping("/join")
    public ResponseEntity<String> join(@RequestBody JoinRequest dto) {
        memberService.join(dto);
        return ResponseEntity.ok("성공적으로 주민이 되셨습니다! 🍃");
    }

    @PostMapping("/login")
    public ResponseEntity<MemberResponse> login(@RequestBody LoginRequest dto) {
        return ResponseEntity.ok(memberService.login(dto));
    }

    @GetMapping("/me")
    public ResponseEntity<MemberResponse> getMyInfo() {
        // Spring Security의 SecurityContextHolder에서 현재 로그인한 유저의 이메일을 가져옵니다.
        String email = SecurityContextHolder.getContext().getAuthentication().getName();

        MemberResponse response = memberService.getMemberInfo(email);
        return ResponseEntity.ok(response);
    }
}