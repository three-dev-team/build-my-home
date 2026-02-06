package com.buildmyhome.common.util;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * 닉네임 금칙어 검증 유틸리티
 *
 * - resources/badwords.json 파일에서 금칙어 목록을 로드
 * - 띄어쓰기 제거 후 포함 여부 검사 (우회 방지)
 * - 닉네임 길이, 특수문자 등 기본 유효성도 함께 검증
 *
 * 사용 예:
 *   NicknameValidator.ValidationResult result = nicknameValidator.validate("테스트닉네임");
 *   if (!result.isValid()) {
 *       throw new IllegalArgumentException(result.getMessage());
 *   }
 */

@Component
@Slf4j
public class NicknameValidator {

    private final Set<String> badWords = new HashSet<>();

    // 닉네임 길이 제한
    private static final int MIN_LENGTH = 1;
    private static final int MAX_LENGTH = 5;

    // 한글, 영문, 숫자만 허용
    private static final String ALLOWED_PATTERN = "^[가-힣a-zA-Z0-9]+$";

    // 금칙어 입력 파일에서 로드
    @PostConstruct
    public void init() {
        try {
            ClassPathResource resource = new ClassPathResource("badwords.json");
            InputStream is = resource.getInputStream();
            ObjectMapper mapper = new ObjectMapper();
            List<String> words = mapper.readValue(is, new TypeReference<>() {});

            // 모두 소문자 + 공백 제거 후 저장
            for (String word : words) {
                badWords.add(normalize(word));
            }

            log.info("금칙어 {}개 로드 완료", badWords.size());
        } catch (Exception e) {
            log.error("금칙어 목록 로드 실패", e);
        }
    }

    /**
     * 닉네임 종합 검증
     */
    public ValidationResult validate(String nickname) {
        if (nickname == null || nickname.isBlank()) {
            return ValidationResult.fail("닉네임을 입력해주세요.");
        }

        String trimmed = nickname.trim();

        // 길이 체크
        if (trimmed.length() < MIN_LENGTH) {
            return ValidationResult.fail("닉네임은 최소 " + MIN_LENGTH + "자\n 이상이어야 합니다.");
        }
        if (trimmed.length() > MAX_LENGTH) {
            return ValidationResult.fail("닉네임은 최대 " + MAX_LENGTH + "자까지 가능합니다.");
        }

        // 허용 문자 체크
        if (!trimmed.matches(ALLOWED_PATTERN)) {
            return ValidationResult.fail("닉네임은 한글, 영문, 숫자만\n사용할 수 있습니다.");
        }

        // 금칙어 체크
        if (containsBadWord(trimmed)) {
            return ValidationResult.fail("사용할 수 없는 닉네임입니다.");
        }

        return ValidationResult.ok();
    }

    /**
     * 금칙어 포함 여부 검사
     * - 공백/특수문자 제거 후 검사하여 "시 발" 같은 우회를 방지
     */
    public boolean containsBadWord(String text) {
        String normalized = normalize(text);

        for (String bad : badWords) {
            if (normalized.contains(bad)) {
                return true;
            }
        }
        return false;
    }

    /**
     * 정규화: 소문자 변환 + 공백/특수문자 제거
     */
    private String normalize(String text) {
        return text.toLowerCase().replaceAll("[\\s\\p{Punct}]", "");
    }

    /**
     * 검증 결과
     */
    public record ValidationResult(boolean valid, String message) {
        public static ValidationResult ok() {
            return new ValidationResult(true, null);
        }

        public static ValidationResult fail(String message) {
            return new ValidationResult(false, message);
        }

        public boolean isValid() {
            return valid;
        }

        public String getMessage() {
            return message;
        }
    }
}
