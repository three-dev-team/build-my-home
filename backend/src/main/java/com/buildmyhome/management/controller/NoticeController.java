package com.buildmyhome.management.controller;

import com.buildmyhome.management.dto.NoticeListResponse;
import com.buildmyhome.management.dto.NoticeResponse;
import com.buildmyhome.management.service.NoticeService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notices")
@RequiredArgsConstructor
public class NoticeController {

    // 사용자 공지사항 조회용 컨트롤러
    private final NoticeService noticeService;

    // 공지사항 목록 조회
    @GetMapping
    public ResponseEntity<Page<NoticeListResponse>> getNotices(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {

        Page<NoticeListResponse> responses;
        if (keyword != null && !keyword.trim().isEmpty()) {
            responses = noticeService.searchNotices(keyword, pageable);
        } else {
            responses = noticeService.getAllNotices(pageable);
        }
        return ResponseEntity.ok(responses);
    }

    // 공지사항 상세 조회
    @GetMapping("/{id}")
    public ResponseEntity<NoticeResponse> getNotice(@PathVariable Long id) {
        NoticeResponse response = noticeService.getNotice(id);
        return ResponseEntity.ok(response);
    }
}
