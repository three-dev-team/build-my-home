package com.buildmyhome.member.scheduler;

import com.buildmyhome.member.entity.Member;
import com.buildmyhome.member.repository.MemberRepository;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 정지 회원 자동 해제 스케줄러
 * - 1분마다 실행
 * - suspendedUntil이 현재 시간보다 과거인 정지 회원을 자동 해제
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MemberSuspensionScheduler {

  private final MemberRepository memberRepository;

  @Scheduled(fixedDelay = 60000) // 1분마다 실행
  @Transactional
  public void releaseSuspendedMembers() {
    LocalDateTime now = LocalDateTime.now();
    List<Member> suspendedMembers = memberRepository.findByIsSuspendedTrueAndSuspendedUntilBefore(now);

    if (!suspendedMembers.isEmpty()) {
      log.info("정지 해제 대상 회원 수: {}", suspendedMembers.size());
      for (Member member : suspendedMembers) {
        member.setIsSuspended(false);
        member.setSuspendedUntil(null);
        log.info("정지 해제 완료: memberId={}, email={}", member.getId(), member.getEmail());
      }
    }
  }
}
