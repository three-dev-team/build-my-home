package com.buildmyhome.management.dto;

import com.buildmyhome.management.entity.InquiryCategory;
import com.buildmyhome.management.entity.InquiryStatus;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@ToString
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class InquiryResponse {
    private Long id;                    // 문의 번호
    private String title;               // 문의 제목
    private String content;             // 문의 내용
    private InquiryStatus status;       // 문의 상태 (OPEN/ANSWERED)
    private InquiryCategory category;   // 문의 카테고리
    private Long memberId;              // 작성자 ID
    private String memberNickname;      // 작성자 닉네임
    private LocalDateTime createdAt;    // 작성일
    private LocalDateTime updatedAt;    // 수정일
    private AnswerResponse answer;      // 답변
}
