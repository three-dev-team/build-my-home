package com.buildmyhome.management.repository;

import com.buildmyhome.management.entity.Answer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AnswerRepository extends JpaRepository<Answer, Long> {

    // 특정 문의의 답변 조회
    Optional<Answer> findByInquiryId(Long inquiryId);

    // 특정 문의에 답변이 있는지 확인
    boolean existsByInquiryId(Long inquiryId);

}
