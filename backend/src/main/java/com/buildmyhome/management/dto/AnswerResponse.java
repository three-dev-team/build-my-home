package com.buildmyhome.management.dto;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@ToString
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class AnswerResponse {
    private Long id;                    // 답변 번호
    private String content;             // 답변 내용
    private Long adminId;               // 답변 작성한 관리자 ID
    private String adminNickname;       // 관리자 닉네임
    private LocalDateTime createdAt;    // 답변 작성일
}
