package com.buildmyhome.room.entity;

import com.buildmyhome.common.entity.BaseTimeEntity;
import com.buildmyhome.member.entity.Member;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
  name = "rooms",
  indexes = {
    // 방이 많아졌을 때 "WAITING만" + "id 범위조회(>=, <)"를 빠르게 하기 위한 인덱스
    @Index(name = "idx_rooms_status_id", columnList = "status,id"),
  }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Room extends BaseTimeEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false)
  private String title;

  @Column(nullable = false)
  private Integer maxPlayers; // 2 ~ 4

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  @Builder.Default
  private Status status = Status.WAITING;

  @Column(nullable = false)
  private Integer totalRounds; // 5, 10, 15, 20

  @Column
  private String password;

  @Column(unique = true, length = 6)
  private String inviteCode;


  public enum Status {
    WAITING, // 대기 중
    PLAYING, // 게임 중
  }
}
