package com.buildmyhome.management.repository;

import com.buildmyhome.management.entity.Inquiry;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface InquiryRepository extends JpaRepository<Inquiry, Long> {
  // 특정 회원의 문의 목록 조회 (페이징)
  Page<Inquiry> findByMemberId(Long memberId, Pageable pageable);

  // 특정 회원의 문의 개수
  long countByMemberId(Long memberId);

  // 커서 기반 조회 (사용자용) - 추가
  @Query("SELECT i FROM Inquiry i WHERE i.member.id = :memberId AND i.id < :cursor ORDER BY i.id DESC")
  List<Inquiry> findByMemberIdWithCursor(
    @Param("memberId") Long memberId,
    @Param("cursor") Long cursor,
    Pageable pageable
  );

  // 첫 페이지 조회 (커서 없을 때) - 추가
  @Query("SELECT i FROM Inquiry i WHERE i.member.id = :memberId ORDER BY i.id DESC")
  List<Inquiry> findByMemberIdFirstPage(@Param("memberId") Long memberId, Pageable pageable);
}
