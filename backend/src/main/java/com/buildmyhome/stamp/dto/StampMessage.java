package com.buildmyhome.stamp.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class StampMessage {
    private Long roomId;
    private Long memberId;
    private String stampType;
}
