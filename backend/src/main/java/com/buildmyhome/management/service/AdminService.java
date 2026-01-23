package com.buildmyhome.management.service;

import com.buildmyhome.management.dto.MemberListResponse;
import com.buildmyhome.member.entity.Member;
import com.buildmyhome.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminService {

  private final MemberRepository memberRepository;

  // 전체 회원 목록 조회
  public Page<MemberListResponse> getAllMembers(Pageable pageable) {
    Page<Member> members = memberRepository.findAll(pageable);
    return members.map(this::toListResponse);
  }

  // 변환 메서드
  private MemberListResponse toListResponse(Member member) {
    return MemberListResponse.builder()
      .id(member.getId())
      .email(member.getEmail())
      .nickname(member.getNickname())
      .role(member.getRole().name())
      .level(member.getLevel())
      .bell(member.getBell())
      .playCount(member.getPlayCount())
      .createdAt(member.getCreatedAt())
      .build();
  }
}
