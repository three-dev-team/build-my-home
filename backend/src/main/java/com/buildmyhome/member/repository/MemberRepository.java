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

  // @Where 필터를 우회하여 탈퇴한 회원 조회
  @Query(value = "SELECT * FROM members WHERE email = :email AND is_del = 'Y'", nativeQuery = true)
  Optional<Member> findDeletedByEmail(@Param("email") String email);

  // @Where 필터를 우회하여 탈퇴한 회원 하드 삭제
  @org.springframework.data.jpa.repository.Modifying(clearAutomatically = true, flushAutomatically = true)
  @Query(value = "DELETE FROM members WHERE email = :email AND is_del = 'Y'", nativeQuery = true)
  void hardDeleteByEmail(@Param("email") String email);

  // 회원의 문의에 달린 답변 삭제 (FK: answers → inquiries → members)
  @org.springframework.data.jpa.repository.Modifying(clearAutomatically = true, flushAutomatically = true)
  @Query(value = "DELETE FROM answers WHERE inquiry_id IN (SELECT id FROM inquires WHERE member_id = :memberId)", nativeQuery = true)
  void hardDeleteAnswersByMemberId(@Param("memberId") Long memberId);

  // 회원의 문의 삭제 (FK: inquiries → members)
  @org.springframework.data.jpa.repository.Modifying(clearAutomatically = true, flushAutomatically = true)
  @Query(value = "DELETE FROM inquires WHERE member_id = :memberId", nativeQuery = true)
  void hardDeleteInquiriesByMemberId(@Param("memberId") Long memberId);

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

