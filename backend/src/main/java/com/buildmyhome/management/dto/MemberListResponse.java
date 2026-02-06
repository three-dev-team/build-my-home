package com.buildmyhome.management.dto;

import java.time.LocalDateTime;
import lombok.*;

@Getter
@Setter
@ToString
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MemberListResponse {

  private Long id;
  private String email;
  private String nickname;
  private String role; // "MEMBER" 또는 "ADMIN"
  private Integer level;
  private Integer bell;
  private Integer playCount;
  private Boolean isOnline; // 접속 상태
  private LocalDateTime lastLoginAt; // 마지막 로그인
  private Integer reportedCount; // 신고 횟수
  private Integer warningCount; // 관리자 경고 횟수
  private Boolean isSuspended; // 정지 여부
  private LocalDateTime createdAt;
}
