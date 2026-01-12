package com.buildmyhome.room.entity;

import com.buildmyhome.common.entity.BaseTimeEntity;
import com.buildmyhome.member.entity.Member;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "rooms")
@Getter
@Setter
@ToString(exclude = "host")
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

    @Builder.Default
    @Column(nullable = false)
    private Integer currentPlayers = 1;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Status status = Status.WAITING;

    @Column(nullable = false)
    private Integer totalRounds; // 5, 10, 15, 20

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "host_id", nullable = false)
    private Member host; // 방장

    public enum Status {
        WAITING, // 대기 중
        PLAYING // 게임 중
    }
}
