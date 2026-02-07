package com.buildmyhome.management.dto;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class NoticeListResponse {
    /* 목록용 - content 안받아옴 */
    private Long id;
    private String title;
    private String adminNickname;
    private Integer viewCount;
    private LocalDateTime createdAt;

}
