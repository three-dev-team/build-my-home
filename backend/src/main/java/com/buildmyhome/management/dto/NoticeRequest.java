package com.buildmyhome.management.dto;

import lombok.*;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class NoticeRequest {
    /* 요청용 */
    private String title;
    private String content;
}
