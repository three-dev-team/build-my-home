package com.buildmyhome.swap.service;

import java.util.Optional;

public interface SwapService {

    // 스왑 칸 진입 직후 호출
    void start(Long roomId);

    // 스페이스바 확정 호출
    void confirm(Long roomId, Long actorId);

    // WAITING_SWAP 타임아웃 강제 종료
    void onTimeout(Long roomId);

    // 재접속 동기화용 payload 제공
    Optional<String> getPayload(Long roomId);

    // 세션 정리
    void clear(Long roomId);
}
