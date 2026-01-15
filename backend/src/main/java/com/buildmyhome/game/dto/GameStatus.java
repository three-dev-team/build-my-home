package com.buildmyhome.game.dto;

public enum GameStatus {
    DETERMINING_ORDER, // 순서 정하기 페이지

    // --- 여기서부터 PLAYING 영역 ---
    WAITING_DICE,      // 주사위 굴리기 대기 (현재 턴 유저의 굴리기 버튼 활성화)
    MOVING,            // 캐릭터 이동 중 (애니메이션 연출 시간 확보용)

    // --- 칸 이벤트별 유저 입력을 기다리는 상태 ---
//    WAITING_STAMP,         // 스탬프칸 이용 중
//    WAITING_RESOURCES,     // 재화칸 이용 중
//    WAITING_HARVEST,       // 수확물칸 이용 중
    WAITING_SHOP_ITEM,     // 아이템 상점 이용 중
    WAITING_SHOP_RESOURCE, // 재화 상점 이용 중
    WAITING_LOAN,          // 대출 여부 선택 중
    WAITING_FISHING,       // 낚시 미니게임 진행 중
    WAITING_KK,            // KK칸 진행 중

    // --- 다음 턴으로 넘어가기 전 ---
    TURN_END_PENDING,      // 턴 종료 전 확인 단계(공통)

    FINISHED               // 결과 페이지
}
