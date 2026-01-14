package com.buildmyhome.room.entity;

import com.buildmyhome.common.entity.BaseTimeEntity;
import com.buildmyhome.member.entity.Member;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "rooms")
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

    public enum Status {
        WAITING, // 대기 중
        PLAYING // 게임 중
    }
}
