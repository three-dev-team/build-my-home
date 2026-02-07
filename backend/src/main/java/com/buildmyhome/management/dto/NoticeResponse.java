package com.buildmyhome.management.dto;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class NoticeResponse {
    /* 상세 조회용 */
    private Long id;
    private String title;
    private String content;
    private Long adminId;
    private String adminNickname;
    private Integer viewCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

}
