package com.buildmyhome.management.controller;

import com.buildmyhome.management.dto.*;
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
@RequestMapping("/api/member/inquiries")
@RequiredArgsConstructor
public class InquiryController {

  private final InquiryService inquiryService;
  private final MemberRepository memberRepository;

  // ========== 일반 사용자 API ==========

  // 문의 등록
  @PostMapping
  public ResponseEntity<InquiryResponse> createInquiry(@RequestBody InquiryRequest request) {
    Member member = getCurrentMember();
    InquiryResponse response = inquiryService.createInquiry(request, member);
    return ResponseEntity.ok(response);
  }

  // 내 문의 목록 조회 (커서 기반) - 새로 추가
  @GetMapping("/my")
  public ResponseEntity<List<InquiryListResponse>> getMyInquiries(
    @RequestParam(required = false) Long cursor,
    @RequestParam(defaultValue = "10") int size
  ) {
    Member member = getCurrentMember();
    List<InquiryListResponse> responses = inquiryService.getMyInquiriesWithCursor(member, cursor, size);
    return ResponseEntity.ok(responses);
  }

  // 내 문의 상세 조회
  @GetMapping("/my/{id}")
  public ResponseEntity<InquiryResponse> getMyInquiry(@PathVariable Long id) {
    Member member = getCurrentMember();
    InquiryResponse response = inquiryService.getInquiry(id);

    // 본인 문의인지 확인
    if (!response.getMemberId().equals(member.getId())) {
      throw new RuntimeException("본인의 문의만 조회할 수 있습니다.");
    }

    return ResponseEntity.ok(response);
  }

  // ========== 헬퍼 메서드 ==========

  private Member getCurrentMember() {
    Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
    String email = authentication.getName();

    return memberRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
  }
}
