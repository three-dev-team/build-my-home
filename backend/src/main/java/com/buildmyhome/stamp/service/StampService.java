package com.buildmyhome.stamp.service;

public interface StampService {
    void acquireStamp(Long roomId, Long memberId, String stampType);
}
