package com.buildmyhome.management.repository;

import com.buildmyhome.management.entity.Inquiry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InquiryRepository extends JpaRepository<Inquiry, Long> {

    // 특정 회원의 문의 목록 조회 (페이징)
    Page<Inquiry> findByMemberId(Long memberId, Pageable pageable);

    // 특정 회원의 문의 개수
    long countByMemberId(Long memberId);

}
