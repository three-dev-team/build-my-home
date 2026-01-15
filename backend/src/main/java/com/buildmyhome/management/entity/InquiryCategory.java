package com.buildmyhome.management.entity;

public enum InquiryCategory {
    USER_REPORT("유저 신고"),
    BUG_REPORT("버그 신고"),
    ETC("기타");

    private final String description;

    InquiryCategory(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}