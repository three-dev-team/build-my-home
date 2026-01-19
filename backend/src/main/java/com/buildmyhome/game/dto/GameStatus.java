package com.buildmyhome.game.dto;

import lombok.Getter;

@Getter
public enum GameStatus {

    // 타이머가 필요없는 status는 0으로 설정
    INTRO(0),              // 소개 페이지
    DETERMINING_ORDER(30),  // 순서 정하기 페이지

    // --- PLAYING 영역 ---
    WAITING_PLAYER_ACTION(0),  // 유저 액션 (주사위, 아이템, 맵) 선택 대기 중
    WAITING_DICE(20),           // 주사위 굴리기 대기
    MOVING(0),                 // 캐릭터 이동 중 (애니메이션 연출 시간 확보용)

    // --- 칸 이벤트별 유저 입력을 기다리는 상태 ---
    WAITING_STAMP(15),         // 스탬프칸 이용 중
    WAITING_RESOURCES(15),     // 재화칸 이용 중
    WAITING_HARVEST(15),       // 수확물칸 이용 중
    WAITING_SHOP_ITEM(20),     // 아이템 상점 이용 중
    WAITING_SHOP_RESOURCE(20), // 재화 상점 이용 중
    WAITING_LOAN(30),          // 대출 여부 선택 중
    WAITING_FISHING(30),       // 낚시 미니게임 진행 중
    SUPER_EVENT(0),           // 은행/스탬프 등 슈퍼 이벤트 진행 중
    WAITING_KK(20),            // KK칸 진행 중 (KK 노래 여러개)

    // --- 다음 턴으로 넘어가기 전 ---
    TURN_END_PENDING(0),      // 턴 종료 전 확인 단계(공통)

    FINISHED(0);               // 결과 페이지

    private final int timeoutSeconds;

    GameStatus(int timeoutSeconds) {
        this.timeoutSeconds = timeoutSeconds;
    }

    // 이 상태는 시간이 지나면 자동으로 다음으로 넘어가야 하는가
    public boolean isAutoProceed() {
        return this.timeoutSeconds > 0;
    }

}
