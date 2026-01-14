package com.buildmyhome.management.entity;

import com.buildmyhome.common.entity.BaseTimeEntity;
import com.buildmyhome.member.entity.Member;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "inquires")
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class Inquiry extends BaseTimeEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;  // 문의 작성한 회원

    @Column(nullable = false, length = 200)
    private String title;  // 문의 제목

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;  // 문의 내용

    @Column(length = 500)
    private String imageUrl;  // 업로드된 이미지 경로

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private InquiryStatus status = InquiryStatus.OPEN;  // 문의 상태

    @OneToOne(mappedBy = "inquiry", cascade = CascadeType.ALL, orphanRemoval = true)
    private Answer answer;  // 답변 (1:1 관계)

    // 상태 변경 메서드
    public void updateStatus(InquiryStatus status) {
        this.status = status;
    }

    // 답변 완료 여부
    public boolean isAnswered() {
        return this.status == InquiryStatus.ANSWERED;
    }

    // 작성자 확인 (본인 문의인지 체크)
    public boolean isOwner(Long memberId) {
        return this.member.getId().equals(memberId);
    }
}

