package com.buildmyhome.management.dto;

import com.buildmyhome.management.entity.InquiryCategory;
import lombok.*;

@Getter
@Setter
@ToString
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class InquiryRequest {

  private String title; // 문의 제목
  private String content; // 문의 내용
  private InquiryCategory category;
}
