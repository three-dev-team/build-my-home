package com.buildmyhome.management.controller;

import com.buildmyhome.management.dto.*;
import com.buildmyhome.management.service.AdminService;
import com.buildmyhome.management.service.InquiryService;
import com.buildmyhome.member.entity.Member;
import com.buildmyhome.member.repository.MemberRepository;
import java.util.List;
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

  // 전체 문의 목록 조회 (필터/정렬 지원)
  @GetMapping("/inquiries")
  public ResponseEntity<Page<InquiryListResponse>> getAllInquiries(
    @RequestParam(required = false) String keyword,
    @RequestParam(required = false) List<String> categories,
    @RequestParam(required = false) List<String> statuses,
    @RequestParam(required = false, defaultValue = "latest") String sort,
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "4") int size
  ) {
    // 정렬 설정
    Sort sortOrder;
    switch (sort) {
      case "oldest":
        sortOrder = Sort.by(Sort.Direction.ASC, "createdAt");
        break;
      case "pending":
        sortOrder = Sort.by(Sort.Direction.ASC, "status").and(Sort.by(Sort.Direction.DESC, "createdAt"));
        break;
      default: // latest
        sortOrder = Sort.by(Sort.Direction.DESC, "createdAt");
    }
    Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size, sortOrder);

    // 카테고리/상태 문자열을 Enum으로 변환
    List<com.buildmyhome.management.entity.InquiryCategory> categoryEnums = null;
    if (categories != null && !categories.isEmpty()) {
      categoryEnums = categories.stream()
          .map(c -> com.buildmyhome.management.entity.InquiryCategory.valueOf(c))
          .toList();
    }
    
    List<com.buildmyhome.management.entity.InquiryStatus> statusEnums = null;
    if (statuses != null && !statuses.isEmpty()) {
      statusEnums = statuses.stream()
          .map(s -> com.buildmyhome.management.entity.InquiryStatus.valueOf(s))
          .toList();
    }

    Page<InquiryListResponse> inquiries = inquiryService.searchInquiries(keyword, categoryEnums, statusEnums, pageable);
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

  // 전체 회원 목록 조회 (필터/정렬 지원)
  @GetMapping("/members")
  public ResponseEntity<Page<MemberListResponse>> getAllMembers(
    @RequestParam(required = false) String keyword,
    @RequestParam(required = false) List<String> roles,
    @RequestParam(required = false) Boolean suspended,
    @RequestParam(required = false, defaultValue = "latest") String sort,
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "10") int size
  ) {
    // 정렬 설정
    Sort sortOrder;
    switch (sort) {
      case "oldest":
        sortOrder = Sort.by(Sort.Direction.ASC, "createdAt");
        break;
      case "level":
        sortOrder = Sort.by(Sort.Direction.DESC, "level");
        break;
      case "bell":
        sortOrder = Sort.by(Sort.Direction.DESC, "bell");
        break;
      case "warning":
        sortOrder = Sort.by(Sort.Direction.DESC, "warningCount");
        break;
      default: // latest
        sortOrder = Sort.by(Sort.Direction.DESC, "createdAt");
    }
    Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size, sortOrder);

    Page<MemberListResponse> members = adminService.searchMembers(keyword, roles, suspended, pageable);
    return ResponseEntity.ok(members);
  }

  // 회원 정지 설정
  @PostMapping("/members/{id}/suspend")
  public ResponseEntity<?> suspendMember(@PathVariable Long id) {
    Member member = memberRepository.findById(id)
        .orElseThrow(() -> new RuntimeException("회원을 찾을 수 없습니다."));
    
    member.setIsSuspended(true);
    member.setSuspendedUntil(java.time.LocalDateTime.now().plusHours(48)); // 48시간 정지
    memberRepository.save(member);
    
    return ResponseEntity.ok().body(java.util.Map.of("message", "회원이 정지되었습니다.", "suspendedUntil", member.getSuspendedUntil()));
  }

  // 회원 정지 해제
  @PostMapping("/members/{id}/unsuspend")
  public ResponseEntity<?> unsuspendMember(@PathVariable Long id) {
    Member member = memberRepository.findById(id)
        .orElseThrow(() -> new RuntimeException("회원을 찾을 수 없습니다."));
    
    member.setIsSuspended(false);
    member.setSuspendedUntil(null);
    
    // 경고 5회 이상으로 정지된 경우 경고 초기화
    if (member.getWarningCount() != null && member.getWarningCount() >= 5) {
      member.setWarningCount(0);
    }
    
    memberRepository.save(member);
    
    return ResponseEntity.ok().body(java.util.Map.of("message", "정지가 해제되었습니다."));
  }

  // 회원 경고 부여 (5회 누적 시 자동 정지)
  @PostMapping("/members/{id}/warn")
  public ResponseEntity<?> warnMember(@PathVariable Long id) {
    Member member = memberRepository.findById(id)
        .orElseThrow(() -> new RuntimeException("회원을 찾을 수 없습니다."));
    
    // 경고 횟수 증가
    int newCount = (member.getWarningCount() != null ? member.getWarningCount() : 0) + 1;
    member.setWarningCount(newCount);
    
    // 5회 이상 시 자동 정지 (영구 정지)
    boolean autoSuspended = false;
    if (newCount >= 5 && !Boolean.TRUE.equals(member.getIsSuspended())) {
      member.setIsSuspended(true);
      member.setSuspendedUntil(null); // 영구 정지 (관리자 해제 필요)
      autoSuspended = true;
    }
    
    memberRepository.save(member);
    
    return ResponseEntity.ok().body(java.util.Map.of(
        "message", autoSuspended ? "경고 5회 누적으로 계정이 자동 정지되었습니다." : "경고가 부여되었습니다.",
        "warningCount", newCount,
        "isSuspended", member.getIsSuspended()
    ));
  }

  // ========== 헬퍼 메서드 ==========

  private Member getCurrentMember() {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    String email = authentication.getName();

    return memberRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
  }
}
