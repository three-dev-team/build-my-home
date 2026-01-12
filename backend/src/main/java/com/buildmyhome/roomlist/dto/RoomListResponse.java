package com.buildmyhome.roomlist.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class RoomListResponse {
    private Long roomId; // 방 번호
    private String title; // 방 제목
    private int currentPlayers; // 현재 방 인원수
    private int maxPlayers; // 방 최대 정원
    private int totalRounds; // 게임 판수
    private boolean joinable; // 입장 버튼 활성/비활성
    private String hostNickname; // 방장 닉네임
    private LocalDateTime createdAt; // 방 생성 시간
}
