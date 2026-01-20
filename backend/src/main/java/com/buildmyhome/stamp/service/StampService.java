package com.buildmyhome.stamp.service;

import com.buildmyhome.stamp.dto.StampMessage;

public interface StampService {
    void acquireStamp(StampMessage message);
}
