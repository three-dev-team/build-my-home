package com.buildmyhome.member.repository;

import com.buildmyhome.member.entity.Member;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MemberRepository extends JpaRepository<Member, Long> {
  Optional<Member> findByEmail(String email);
  Optional<Member> findByKakaoId(String kakaoId);
  Optional<Member> findByNaverId(String naverId);
  Optional<Member> findByGoogleId(String googleId);

  boolean existsByEmail(String email);

  boolean existsByNickname(String nickname);

  // 닉네임으로 검색 (관리자용) - 추가
  Page<Member> findByNicknameContainingIgnoreCase(String nickname, Pageable pageable);
}
