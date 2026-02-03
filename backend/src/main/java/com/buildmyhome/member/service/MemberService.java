package com.buildmyhome.member.service;

import com.buildmyhome.member.dto.JoinRequest;
import com.buildmyhome.member.dto.LoginRequest;
import com.buildmyhome.member.dto.MemberResponse;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public interface MemberService {
  MemberResponse login(LoginRequest loginRequest);

  void join(JoinRequest dto);

  boolean existsByNickname(String nickname);

  MemberResponse getMemberInfo(String email);

  void sendAuthCode(String email);

  boolean verifyCode(String email, String code);

  void resetPassword(String email, String newPassword);

  void sendRegistrationCode(String email);

  boolean existsByEmail(String email);

  void updateNickname(
    String email,
    @NotBlank(message = "닉네임은 필수입니다.") @Size(
      min = 2,
      max = 10,
      message = "닉네임은 2~10자 사이여야 합니다."
    ) String nickname
  );

  void withdraw(String email);

  void unlinkSocialAccount(String email, String provider);

  MemberResponse updateProfileImage(String email, org.springframework.web.multipart.MultipartFile file);
}
