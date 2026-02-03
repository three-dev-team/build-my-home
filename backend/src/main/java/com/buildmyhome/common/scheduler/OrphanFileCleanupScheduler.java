package com.buildmyhome.common.scheduler;

import com.buildmyhome.member.repository.MemberRepository;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * DB에 참조되지 않는 업로드된 이미지 파일을 자동으로 삭제하는 스케줄러
 */
@Component
public class OrphanFileCleanupScheduler {

  private static final Logger log = LoggerFactory.getLogger(OrphanFileCleanupScheduler.class);
  
  private final MemberRepository memberRepository;
  private final Path uploadPath;

  public OrphanFileCleanupScheduler(MemberRepository memberRepository) {
    this.memberRepository = memberRepository;
    this.uploadPath = Paths.get(System.getProperty("user.dir"), "uploads", "profiles");
  }

  /**
   * 매일 새벽 3시에 파일 정리 실행
   * cron 형식: 초 분 시 일 월 요일
   */
  @Scheduled(cron = "0 46 15 * * *")
  public void cleanupOrphanFiles() {
    log.info("[OrphanFileCleanup] 파일 정리 시작");
    
    try {
      // DB에서 모든 프로필 이미지 경로 조회
      List<String> dbImagePaths = memberRepository.findAllProfileImagePaths();
      
      // 파일명만 추출 (예: "/uploads/profiles/abc.png" -> "abc.png")
      Set<String> dbFileNames = dbImagePaths.stream()
          .map(path -> Paths.get(path).getFileName().toString())
          .collect(Collectors.toSet());
      
      // default-profile.png는 삭제하지 않음 (기본 이미지)
      dbFileNames.add("default-profile.png");
      
      log.info("[OrphanFileCleanup] DB에 등록된 이미지: {} 개", dbFileNames.size());
      
      // 업로드 폴더의 모든 파일 조회
      if (!Files.exists(uploadPath)) {
        log.info("[OrphanFileCleanup] 업로드 폴더가 존재하지 않음: {}", uploadPath);
        return;
      }
      
      int deletedCount = 0;
      try (Stream<Path> files = Files.list(uploadPath)) {
        List<Path> allFiles = files.filter(Files::isRegularFile).collect(Collectors.toList());
        
        for (Path file : allFiles) {
          String fileName = file.getFileName().toString();
          
          if (!dbFileNames.contains(fileName)) {
            // DB에 없는 파일 삭제
            Files.delete(file);
            log.info("[OrphanFileCleanup] 삭제됨: {}", fileName);
            deletedCount++;
          }
        }
      }
      
      log.info("[OrphanFileCleanup] 고아 파일 정리 완료. 삭제된 파일: {} 개", deletedCount);
      
    } catch (IOException e) {
      log.error("[OrphanFileCleanup] 파일 정리 중 오류 발생", e);
    }
  }
}
