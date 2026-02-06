package com.buildmyhome.member.entity;

import com.buildmyhome.common.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "members")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@org.hibernate.annotations.Where(clause = "is_del = 'N'")
public class Member extends BaseTimeEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, unique = true)
  private String email;

  @Column(nullable = false)
  private String password;

  @Column(nullable = false)
  private String nickname;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  @Builder.Default
  private Role role = Role.MEMBER;

  @Column
  private String kakaoId;

  @Column
  private String naverId;

  @Column
  private String googleId;

  @Column
  private String profileImage;

  @Builder.Default
  private Integer level = 1; // 유저 레벨

  @Builder.Default
  private Integer bell = 0; // 보유 벨(게임 화폐)

  @Builder.Default
  private Integer playCount = 0; // 총 플레이 횟수

  @Builder.Default
  private Boolean isOnline = false; // 현재 접속 상태

  private java.time.LocalDateTime lastLoginAt; // 마지막 로그인 시간

  @Builder.Default
  private Integer reportedCount = 0; // 신고당한 횟수

  @Builder.Default
  private Integer warningCount = 0; // 관리자 경고 횟수

  @Builder.Default
  private Boolean isSuspended = false; // 정지 여부

  private java.time.LocalDateTime suspendedUntil; // 정지 해제 시간

  @Column(columnDefinition = "varchar(1) default 'N'")
  @Builder.Default
  private String isDel = "N"; // 탈퇴 여부 (Y/N)

  private java.time.LocalDateTime deletedAt;

  public enum Role {
    MEMBER,
    ADMIN,
  }
}
