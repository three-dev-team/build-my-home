package com.buildmyhome.management.repository;

import com.buildmyhome.management.entity.Notice;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface NoticeRepository extends JpaRepository<Notice, Long> {

    // 공지사항 목록 조회 (최신순)
    @Query("SELECT n FROM Notice n ORDER BY n.createdAt DESC")
    Page<Notice> findAllOrderByCreatedAtDesc(Pageable pageable);

    // 제목으로 검색
    @Query("SELECT n FROM Notice n WHERE n.title LIKE %:keyword% ORDER BY n.createdAt DESC")
    Page<Notice> findByTitleContaining(String keyword, Pageable pageable);
}
