package com.buildmyhome.management.entity;

import com.buildmyhome.common.entity.BaseTimeEntity;
import com.buildmyhome.member.entity.Member;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "notices")
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class Notice extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String title; // 공지사항 제목

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content; // 공지사항 내용

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "admin_id", nullable = false)
    private Member admin; // 작성한 관리자

    @Column(nullable = false)
    @Builder.Default
    private Integer viewCount = 0; // 조회수

    // 조회수 증가
    public void increaseViewCount() {
        this.viewCount++;
    }

    // 작성자 확인
    public boolean isAuthor(Long adminId) {
        return this.admin.getId().equals(adminId);
    }
}
