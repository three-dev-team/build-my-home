package com.buildmyhome.member.repository;

import com.buildmyhome.member.entity.Member;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MemberRepository extends JpaRepository<Member, Long> {
  Optional<Member> findByEmail(String email);
  Optional<Member> findByKakaoId(String kakaoId);
  Optional<Member> findByNaverId(String naverId);
  Optional<Member> findByGoogleId(String googleId);

  boolean existsByEmail(String email);

  boolean existsByNickname(String nickname);
}
