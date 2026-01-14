package com.buildmyhome.management.service;

import com.buildmyhome.member.entity.Member;
import com.buildmyhome.management.dto.*;
import com.buildmyhome.management.entity.Answer;
import com.buildmyhome.management.entity.Inquiry;
import com.buildmyhome.management.entity.InquiryStatus;
import com.buildmyhome.management.repository.AnswerRepository;
import com.buildmyhome.management.repository.InquiryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class InquiryService {

    private final InquiryRepository inquiryRepository;
    private final AnswerRepository answerRepository;

    // 1. 문의 등록 (사용자)
    public InquiryResponse createInquiry(InquiryRequest request, Member member) {
        Inquiry inquiry = Inquiry.builder()
                .member(member)
                .title(request.getTitle())
                .content(request.getContent())
                .build();
        return toResponse(inquiryRepository.save(inquiry));
    }

    // 2. 내 문의 목록 (사용자)
    @Transactional(readOnly = true)
    public Page<InquiryListResponse> getMyInquiries(Member member, Pageable pageable) {
        return inquiryRepository.findByMemberId(member.getId(), pageable).map(this::toListResponse);
    }

    // 3. 전체 문의 목록 (관리자)
    @Transactional(readOnly = true)
    public Page<InquiryListResponse> getAllInquiries(Pageable pageable) {
        return inquiryRepository.findAll(pageable).map(this::toListResponse);
    }

    // 4. 상세 조회 (공통)
    @Transactional(readOnly = true)
    public InquiryResponse getInquiry(Long id) {
        Inquiry inquiry = inquiryRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("문의를 찾을 수 없습니다."));
        return toResponse(inquiry);
    }

    // 5. 답변 등록 (관리자)
    public AnswerResponse createAnswer(Long inquiryId, AnswerRequest request, Member admin) {
        Inquiry inquiry = inquiryRepository.findById(inquiryId)
                .orElseThrow(() -> new IllegalArgumentException("문의 없음"));

        if (inquiry.getAnswer() != null) throw new IllegalStateException("이미 답변 완료");

        Answer answer = Answer.builder()
                .inquiry(inquiry).admin(admin).content(request.getContent())
                .build();

        inquiry.updateStatus(InquiryStatus.ANSWERED);
        return toAnswerResponse(answerRepository.save(answer));
    }

    // --- 변환 로직 (한 곳에서만 관리) ---
    private InquiryResponse toResponse(Inquiry inquiry) {
        return InquiryResponse.builder()
                .id(inquiry.getId()).title(inquiry.getTitle()).content(inquiry.getContent())
                .status(inquiry.getStatus()).memberId(inquiry.getMember().getId())
                .memberNickname(inquiry.getMember().getNickname())
                .createdAt(inquiry.getCreatedAt()).updatedAt(inquiry.getUpdatedAt())
                .answer(inquiry.getAnswer() != null ? toAnswerResponse(inquiry.getAnswer()) : null)
                .build();
    }

    private InquiryListResponse toListResponse(Inquiry inquiry) {
        return InquiryListResponse.builder()
                .id(inquiry.getId()).title(inquiry.getTitle()).status(inquiry.getStatus())
                .memberNickname(inquiry.getMember().getNickname())
                .createdAt(inquiry.getCreatedAt()).hasAnswer(inquiry.getAnswer() != null)
                .build();
    }

    private AnswerResponse toAnswerResponse(Answer answer) {
        return AnswerResponse.builder()
                .id(answer.getId()).content(answer.getContent())
                .adminId(answer.getAdmin().getId()).adminNickname(answer.getAdmin().getNickname())
                .createdAt(answer.getCreatedAt()).build();
    }
}