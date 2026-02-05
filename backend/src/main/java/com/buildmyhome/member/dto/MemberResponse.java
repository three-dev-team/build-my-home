package com.buildmyhome.member.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.ALWAYS)
public class MemberResponse {

  private Long id; // 유저 PK
  private String token; // JWT 인증 토큰
  private String email;
  private String nickname;
  private Integer level; // 유저 레벨
  private Integer bell; // 보유 벨
  private Integer playCount; // 총 플레이 횟수
  private String role;
  private String kakaoId;
  private String naverId;
  private String googleId;
  private String profileImage;
  
  // 추가 필드
  private Boolean isOnline; // 접속 상태
  private java.time.LocalDateTime lastLoginAt; // 마지막 로그인
  private Integer reportedCount; // 신고 횟수
  
  @JsonProperty("isSuspended")
  private Boolean isSuspended; // 정지 여부
  
  @JsonProperty("suspendedUntil")
  private java.time.LocalDateTime suspendedUntil; // 정지 해제 시간
  
  private java.time.LocalDateTime createdAt; // 가입일
}
