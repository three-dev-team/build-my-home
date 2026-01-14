package com.buildmyhome.management.entity;

import com.buildmyhome.common.entity.BaseTimeEntity;
import com.buildmyhome.member.entity.Member;
import jakarta.persistence.*;
import lombok.*;

    @Entity
    @Table(name = "answers")
    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public class Answer extends BaseTimeEntity {

        @Id
        @GeneratedValue(strategy = GenerationType.IDENTITY)
        private Long id;

        @OneToOne(fetch = FetchType.LAZY)
        @JoinColumn(name = "inquiry_id", nullable = false, unique = true)
        private Inquiry inquiry;  // 어떤 문의에 대한 답변인지

        @ManyToOne(fetch = FetchType.LAZY)
        @JoinColumn(name = "admin_id", nullable = false)
        private Member admin;  // 답변을 작성한 관리자

        @Column(nullable = false, columnDefinition = "TEXT")
        private String content;  // 답변 내용
    }
