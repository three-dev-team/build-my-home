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
  private LocalDateTime createdAt;
}
