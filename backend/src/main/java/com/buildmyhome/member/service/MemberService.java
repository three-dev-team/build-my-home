package com.buildmyhome.member.service;

import com.buildmyhome.member.dto.JoinRequest;
import com.buildmyhome.member.dto.LoginRequest;
import com.buildmyhome.member.dto.MemberResponse;

public interface MemberService {
    MemberResponse login(LoginRequest loginRequest);

    void join(JoinRequest dto);

    boolean existsByNickname(String nickname);

    MemberResponse getMemberInfo(String email);
}
