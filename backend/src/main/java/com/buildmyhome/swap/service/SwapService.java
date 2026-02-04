package com.buildmyhome.swap.service;

import java.util.Optional;

public interface SwapService {
    void confirmPlayer1(Long roomId, Long memberId, Long player1Id);

    void confirmPlayer2(Long roomId, Long memberId, Long player2Id);

    void confirmArrow(Long roomId, Long memberId, String category, String direction);

    void startPlayer1Roulette(Long roomId, Long memberId);

    void startPlayer2Roulette(Long roomId, Long memberId);

    void startArrowRoulette(Long roomId, Long memberId);
//
//    // 스왑 칸 진입 직후 호출
//    void start(Long roomId);
//
//    // 스페이스바 확정 호출
//    void confirm(Long roomId, Long actorId);
//
//    // WAITING_SWAP 타임아웃 강제 종료
//    void onTimeout(Long roomId);
//
//    // 재접속 동기화용 payload 제공
//    Optional<String> getPayload(Long roomId);
//
//    // 세션 정리
//    void clear(Long roomId);
}
