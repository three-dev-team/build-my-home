package com.buildmyhome.member.dto;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MemberResponse {
    private String token;      // JWT 인증 토큰
    private String email;
    private String nickname;
    private Integer level;     // 유저 레벨
    private Integer bell;      // 보유 벨
    private Integer playCount; // 총 플레이 횟수
}
