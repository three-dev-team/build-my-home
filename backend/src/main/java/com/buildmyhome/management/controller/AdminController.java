package com.buildmyhome.management.controller;

import com.buildmyhome.management.dto.*;
import com.buildmyhome.management.service.AdminService;
import com.buildmyhome.management.service.InquiryService;
import com.buildmyhome.member.entity.Member;
import com.buildmyhome.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')") // 관리자만 접근
public class AdminController {

  private final InquiryService inquiryService;
  private final AdminService adminService;
  private final MemberRepository memberRepository;

  // ========== 문의 관리 ==========

  // 전체 문의 목록 조회
  @GetMapping("/inquiries")
  public ResponseEntity<Page<InquiryListResponse>> getAllInquiries(
    @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
  ) {
    Page<InquiryListResponse> inquiries = inquiryService.getAllInquiries(pageable);
    return ResponseEntity.ok(inquiries);
  }

  // 문의 상세 조회
  @GetMapping("/inquiries/{id}")
  public ResponseEntity<InquiryResponse> getInquiry(@PathVariable Long id) {
    InquiryResponse inquiry = inquiryService.getInquiry(id);
    return ResponseEntity.ok(inquiry);
  }

  // 답변 등록
  @PostMapping("/inquiries/{id}/answer")
  public ResponseEntity<AnswerResponse> createAnswer(@PathVariable Long id, @RequestBody AnswerRequest request) {
    Member admin = getCurrentMember();
    AnswerResponse answer = inquiryService.createAnswer(id, request, admin);
    return ResponseEntity.ok(answer);
  }

  // ========== 회원 관리 ==========

  // 전체 회원 목록 조회
  @GetMapping("/members")
  public ResponseEntity<Page<MemberListResponse>> getAllMembers(
    @PageableDefault(size = 50, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
  ) {
    Page<MemberListResponse> members = adminService.getAllMembers(pageable);
    return ResponseEntity.ok(members);
  }

  // ========== 헬퍼 메서드 ==========

  private Member getCurrentMember() {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    String email = authentication.getName();

    return memberRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
  }
}
