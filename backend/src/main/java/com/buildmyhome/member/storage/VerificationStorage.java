package com.buildmyhome.member.storage;

public interface VerificationStorage {
  void save(String email, String code, long durationSeconds);
  String get(String email);
  void remove(String email);
}
