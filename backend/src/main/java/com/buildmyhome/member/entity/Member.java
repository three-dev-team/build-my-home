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

  @Column(columnDefinition = "varchar(1) default 'N'")
  @Builder.Default
  private String isDel = "N"; // 탈퇴 여부 (Y/N)

  private java.time.LocalDateTime deletedAt;

  public enum Role {
    MEMBER,
    ADMIN,
  }
}
