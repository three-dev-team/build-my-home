package com.buildmyhome.management.dto;

import com.buildmyhome.management.entity.InquiryStatus;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@ToString
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class InquiryListResponse {
    // 문의 목록 조회할 때 사용

    private Long id;                    // 문의 번호
    private String title;               // 문의 제목
    private InquiryStatus status;       // 문의 상태 (OPEN/ANSWERED)
    private String memberNickname;      // 작성자 닉네임
    private LocalDateTime createdAt;    // 작성일
    private boolean hasAnswer;          // 답변 유무
}
