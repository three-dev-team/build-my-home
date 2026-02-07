package com.buildmyhome.management.service;

import com.buildmyhome.management.dto.NoticeListResponse;
import com.buildmyhome.management.dto.NoticeRequest;
import com.buildmyhome.management.dto.NoticeResponse;
import com.buildmyhome.management.entity.Notice;
import com.buildmyhome.management.repository.NoticeRepository;
import com.buildmyhome.member.entity.Member;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class NoticeService {

    private final NoticeRepository noticeRepository;

    // 1. 공지사항 작성 (관리자)
    public NoticeResponse createNotice(NoticeRequest request, Member admin) {
        Notice notice = Notice.builder()
                .title(request.getTitle())
                .content(request.getContent())
                .admin(admin)
                .build();

        return toResponse(noticeRepository.save(notice));
    }

    // 2. 공지사항 수정 (관리자)
    public NoticeResponse updateNotice(Long noticeId, NoticeRequest request, Member admin) {
        Notice notice = noticeRepository.findById(noticeId)
                .orElseThrow(() -> new IllegalArgumentException("공지사항을 찾을 수 없습니다."));

        // 작성자 확인
        if (!notice.isAuthor(admin.getId())) {
            throw new IllegalStateException("본인이 작성한 공지사항만 수정할 수 있습니다.");
        }

        notice.setTitle(request.getTitle());
        notice.setContent(request.getContent());

        return toResponse(notice);
    }

    // 3. 공지사항 삭제 (관리자)
    public void deleteNotice(Long noticeId, Member admin) {
        Notice notice = noticeRepository.findById(noticeId)
                .orElseThrow(() -> new IllegalArgumentException("공지사항을 찾을 수 없습니다."));

        // 작성자 확인
        if (!notice.isAuthor(admin.getId())) {
            throw new IllegalStateException("본인이 작성한 공지사항만 삭제할 수 있습니다.");
        }

        noticeRepository.delete(notice);
    }

    // 4. 공지사항 목록 조회 (전체)
    @Transactional(readOnly = true)
    public Page<NoticeListResponse> getAllNotices(Pageable pageable) {
        return noticeRepository.findAllOrderByCreatedAtDesc(pageable)
                .map(this::toListResponse);
    }

    // 5. 제목으로 검색 (전체)
    @Transactional(readOnly = true)
    public Page<NoticeListResponse> searchNotices(String keyword, Pageable pageable) {
        return noticeRepository.findByTitleContaining(keyword, pageable)
                .map(this::toListResponse);
    }

    // 6. 공지사항 상세 조회 (전체)
    public NoticeResponse getNotice(Long noticeId) {
        Notice notice = noticeRepository.findById(noticeId)
                .orElseThrow(() -> new IllegalArgumentException("공지사항을 찾을 수 없습니다."));

        // 조회수 증가
        notice.increaseViewCount();

        return toResponse(notice);
    }

    // --- 변환 로직 ---
    private NoticeResponse toResponse(Notice notice) {
        return NoticeResponse.builder()
                .id(notice.getId())
                .title(notice.getTitle())
                .content(notice.getContent())
                .adminId(notice.getAdmin().getId())
                .adminNickname(notice.getAdmin().getNickname())
                .viewCount(notice.getViewCount())
                .createdAt(notice.getCreatedAt())
                .updatedAt(notice.getUpdatedAt())
                .build();
    }

    private NoticeListResponse toListResponse(Notice notice) {
        return NoticeListResponse.builder()
                .id(notice.getId())
                .title(notice.getTitle())
                .adminNickname(notice.getAdmin().getNickname())
                .viewCount(notice.getViewCount())
                .createdAt(notice.getCreatedAt())
                .build();
    }
}
