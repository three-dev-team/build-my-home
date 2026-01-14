package com.buildmyhome.management.dto;

import lombok.*;

@Getter
@Setter
@ToString
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class AnswerRequest {
    private String content; // 답변 내용
}