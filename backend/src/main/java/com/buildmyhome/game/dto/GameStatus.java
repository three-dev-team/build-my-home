package com.buildmyhome.game.dto;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum GameStatus {
    // 타이머가 필요없는 status는 0으로 설정
    INTRO(0), // 소개 페이지
    DETERMINING_ORDER(30), // 순서 정하기 페이지

    // --- PLAYING 영역 ---
    WAITING_PLAYER_ACTION(0), // 유저 액션 (주사위, 아이템, 맵) 선택 대기 중
    WAITING_DICE(20), // 주사위 굴리기 대기
    ROLLING_DICE(10), // 주사위 굴리는 중 (애니메이션 연출 시간 확보용)
    MOVING(0), // 캐릭터 이동 중 (애니메이션 연출 시간 확보용)
    WAITING_HOUSE(0), // 집짓기
    WAITING_ATM(60), // ATM

    // --- 칸 이벤트별 유저 입력을 기다리는 상태 ---
    WAITING_STAMP(15), // 스탬프칸 이용 중
    WAITING_RESOURCES(5), // 재화칸 이용 중
    WAITING_HARVEST(5), // 수확물칸 이용 중
    WAITING_SHOP_ITEM(40), // 아이템 상점 이용 중
    WAITING_SHOP_RESOURCE(40), // 재화 상점 이용 중
    WAITING_LOAN(30), // 대출 여부 선택 중
    WAITING_FISHING(10), // 시작하기 버튼/연출 단계
    FISHING_IN_PROGRESS(0), // 실제 미니게임 진행(낚시 내부 타이머로 종료)
    SUPER_EVENT(0), // 은행/스탬프 등 슈퍼 이벤트 진행 중
    WAITING_KK(20), // KK칸 진행 중 (KK 노래 여러개)
    WAITING_MUPANI(20), // 무파니 진행 중
    WAITING_START(60), // 시작칸 진행 중 (스탬프 정산)
    WAITING_ITEMS(20),  // 아이템칸 진행 중
    WAITING_MACHURILLA(30), // 마추릴라 진행 중
    WAITING_SWAP(30), // 몽셰르(스왑 이벤트) 진행 중

    // --- 다음 턴으로 넘어가기 전 ---
    TURN_END_PENDING(0), // 턴 종료 전 확인 단계(공통)

    FINISHED(0); // 결과 페이지

    private final int timeoutSeconds;

    // 이 상태는 시간이 지나면 자동으로 다음으로 넘어가야 하는가
    public boolean isAutoProceed() {
        return this.timeoutSeconds > 0;
    }
}
