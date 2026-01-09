package com.buildmyhome.game.entity;

import com.buildmyhome.common.entity.BaseTimeEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "npcs")
@Getter
@Setter
@ToString
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Npc extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;  // 너굴, KK, 무파니 등

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NpcType type;

    private String imageUrl;  // 이미지 경로

    public enum NpcType {
        SHOP,    // 상점
        EVENT,   // 이벤트 (KK, 무파니)
        GUIDE    // 가이드
    }
}