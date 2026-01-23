package com.buildmyhome.mupani.service;

import com.buildmyhome.game.dto.GameState;

public interface MupaniService {

    // 프론트 전달용 거래 결과 데이터
    record TradeResult(
            String type,
            int quantity,
            int amount,
            int price
    ) {}

    // buy skip 공통 처리 결과 데이터
    // 전원 결정 완료 최초 달성 여부 포함 데이터
    record MupaniActionResult(
            TradeResult trade,
            boolean becameAllDecided
    ) {}

    // 무파니 구간 진입 시 세션 초기화 처리
    void startSession(Long roomId, GameState gameState);

    // 무파니 구간 종료 시 세션 제거 처리
    void clearSession(Long roomId);

    // 구매 처리 엔트리포인트
    MupaniActionResult buy(Long roomId, GameState gameState, Long memberId, int qty);

    // 스킵 처리 엔트리포인트
    MupaniActionResult skip(Long roomId, GameState gameState, Long memberId);

    // 판매 처리 엔트리포인트
    TradeResult sell(GameState gameState, Long memberId, int qty);

    // 타임아웃 종료 처리 엔트리포인트
    void onTimeout(Long roomId, GameState gameState);

    // 즉시 턴 종료 처리 엔트리포인트
    void endTurnNow(Long roomId, GameState gameState);
}
