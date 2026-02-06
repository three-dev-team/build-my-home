package com.buildmyhome.member.repository;

import com.buildmyhome.member.entity.Member;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MemberRepository extends JpaRepository<Member, Long> {
  Optional<Member> findByEmail(String email);
  Optional<Member> findByKakaoId(String kakaoId);
  Optional<Member> findByNaverId(String naverId);
  Optional<Member> findByGoogleId(String googleId);

  boolean existsByEmail(String email);

  boolean existsByNickname(String nickname);

  // 닉네임으로 검색 (관리자용) - 추가
  Page<Member> findByNicknameContainingIgnoreCase(String nickname, Pageable pageable);

  // 모든 프로필 이미지 경로 조회 (고아 파일 정리용)
  @Query("SELECT DISTINCT m.profileImage FROM Member m WHERE m.profileImage IS NOT NULL")
  List<String> findAllProfileImagePaths();

  // ========== 관리자용 필터/검색 쿼리 ==========
  
  // 키워드 + 역할 + 정지 상태 필터 검색
  @Query("SELECT m FROM Member m WHERE " +
         "(:keyword IS NULL OR LOWER(m.nickname) LIKE LOWER(CONCAT('%', :keyword, '%'))) AND " +
         "(:roles IS NULL OR m.role IN :roles) AND " +
         "(:suspended IS NULL OR m.isSuspended = :suspended)")
  Page<Member> searchMembers(
    @Param("keyword") String keyword,
    @Param("roles") List<Member.Role> roles,
    @Param("suspended") Boolean suspended,
    Pageable pageable
  );

  // 정지 해제 대상 회원 조회 (스케줄러용)
  List<Member> findByIsSuspendedTrueAndSuspendedUntilBefore(java.time.LocalDateTime dateTime);
}

