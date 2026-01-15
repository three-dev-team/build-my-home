package com.buildmyhome.roomlist.service;

import com.buildmyhome.room.dto.RoomPlayerState;
import com.buildmyhome.room.dto.RoomState;
import com.buildmyhome.room.service.RoomStateService;
import com.buildmyhome.roomlist.dto.RoomListResponse;
import com.buildmyhome.member.entity.Member;
import com.buildmyhome.member.repository.MemberRepository;
import com.buildmyhome.room.entity.Room;
import com.buildmyhome.room.entity.Room.Status;
import com.buildmyhome.room.repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
public class RoomListService {

    private static final int DEFAULT_RANDOM_SIZE = 20;

    private final RoomRepository roomRepository;
    private final MemberRepository memberRepository;
    private final RoomStateService roomStateService;

    // 방 검사 메소드
    private void validateRoomSettings(String title, Integer maxPlayers, Integer totalRounds) {
        if (title == null || title.isBlank()) throw new IllegalArgumentException("방 제목은 필수입니다.");
        if (!List.of(2, 3, 4).contains(maxPlayers)) throw new IllegalArgumentException("인원 설정이 잘못되었습니다.");
        if (!List.of(5, 10, 15, 20).contains(totalRounds)) throw new IllegalArgumentException("라운드 설정이 잘못되었습니다.");
    }

    private RoomListResponse toRoomListResponse(Room room) {
        RoomState roomState = roomStateService.getRoom(room.getId());

        int cur = (roomState != null) ? roomState.getPlayers().size() : 0;
        String hostNickname = (roomState != null) ? roomState.getHostNickname() : "";

        // roomState가 없는 방은(서버 재시작/메모리 유실 등) 실제 입장이 실패할 수 있으니 joinable=false
        boolean joinable = (roomState != null)
                && room.getStatus() == Status.WAITING
                && cur < room.getMaxPlayers();

        return RoomListResponse.builder()
                .roomId(room.getId())
                .title(room.getTitle())
                .currentPlayers(cur)
                .maxPlayers(room.getMaxPlayers())
                .totalRounds(room.getTotalRounds())
                .joinable(joinable)
                .hostNickname(hostNickname)
                .createdAt(room.getCreatedAt())
                .build();
    }

    // 대기방(WAITING)만 랜덤 20개에 뽑아오는 메서드
    // 방이 많아지면 ORDER BY RAND() 같은 전수 정렬 : DB 과부화 -> 인덱스 범위 조회 방식 사용
    // WAITING 방의 minId/maxId 조회 -> minId~maxId 사이에서 랜덤 startId 선택
    // startId 이상에서 LIMIT size 부족하면 startId 미만에서 이어서 채움(랩어라운드)
    @Transactional(readOnly = true)
    public List<RoomListResponse> getRandomWaitingRooms(int size) {
        int pageSize = Math.min(Math.max(size, 1), 50); // 서버 터짐 방지: 1~50 제한

        Room minRoom = roomRepository.findFirstByStatusOrderByIdAsc(Status.WAITING).orElse(null);
        Room maxRoom = roomRepository.findFirstByStatusOrderByIdDesc(Status.WAITING).orElse(null);

        if (minRoom == null || maxRoom == null) {
            return List.of();
        }

        long minId = minRoom.getId();
        long maxId = maxRoom.getId();

        long startId = (minId == maxId)
                ? minId
                : ThreadLocalRandom.current().nextLong(minId, maxId + 1);

        List<Room> picked = new ArrayList<>(pageSize);

        // 1) startId 이상 구간
        picked.addAll(
                roomRepository.findByStatusAndIdGreaterThanEqualOrderByIdAsc(
                        Status.WAITING,
                        startId,
                        PageRequest.of(0, pageSize)
                )
        );

        // 2) 부족하면 startId 미만 구간에서 이어서 채우기(랩어라운드)
        if (picked.size() < pageSize) {
            int remain = pageSize - picked.size();
            picked.addAll(
                    roomRepository.findByStatusAndIdLessThanOrderByIdAsc(
                            Status.WAITING,
                            startId,
                            PageRequest.of(0, remain)
                    )
            );
        }

        // 같은 구간에서 뽑히면 id 순서가 비슷해 보여서, 최종 출력은 한번 섞어주기(메모리에서만)
        Collections.shuffle(picked, ThreadLocalRandom.current());

        return picked.stream()
                .map(this::toRoomListResponse)
                .toList();
    }

    // 기본: 대기방(WAITING) 랜덤 20개 - 첫 페이지
    @Transactional(readOnly = true)
    public List<RoomListResponse> getRoomList() {
        return getRandomWaitingRooms(DEFAULT_RANDOM_SIZE);
    }

    //    TODO: 예외 처리 구체화 RoomValidationException, MemberNotFoundException 등
    @Transactional
    public Long createRoom(Long hostMemberId, String title, Integer maxPlayers, Integer totalRounds) {

        validateRoomSettings(title, maxPlayers, totalRounds);

        Member host = memberRepository.findById(hostMemberId)
                .orElseThrow(() -> new IllegalArgumentException("호스트 회원이 존재하지 않습니다."));

        Room room = Room.builder()
                .title(title.trim())
                .maxPlayers(maxPlayers)
                .status(Status.WAITING)
                .totalRounds(totalRounds)
                .build();

        Room saved = roomRepository.save(room);

        roomStateService.createRoom(saved.getId(), totalRounds);

        // 서버 메모리에 방장 정보 업데이트
        RoomPlayerState hostPlayer = new RoomPlayerState();
        hostPlayer.setMemberId(hostMemberId);
        hostPlayer.setNickname(host.getNickname());
        hostPlayer.setHost(true);
        roomStateService.addPlayerToRoom(saved.getId(), hostPlayer);

        return saved.getId();
    }

    @Transactional
    public void joinRoom(Long memberId, Long roomId) {

        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다."));

        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 방입니다."));

        if (room.getStatus() != Status.WAITING) {
            throw new IllegalStateException("게임 중인 방에는 입장할 수 없습니다.");
        }

        RoomState roomState = roomStateService.getRoom(roomId);

        if (roomState == null) {
            throw new IllegalStateException("방 상태를 찾을 수 없습니다.");
        }

        synchronized (roomState) {
            // roomState에서 이미 해당 멤버가 있는지 확인
            if (roomState.getPlayer(memberId) != null) {
                return;  // null이 아니면 이미 입장함
            }

            int cur = roomState.getPlayers().size();
            if (cur >= room.getMaxPlayers()) {
                throw new IllegalStateException("정원이 가득 찼습니다.");
            }

            // 서버 메모리에 플레이어 정보 추가
            RoomPlayerState player = new RoomPlayerState();
            player.setMemberId(memberId);
            player.setNickname(member.getNickname());
            player.setHost(false);
            roomStateService.addPlayerToRoom(roomId, player);
        }
    }

    @Transactional
    public void leaveRoom(Long memberId, Long roomId) {
        Room room = roomRepository.findById(roomId).orElse(null);
        RoomState roomState = roomStateService.getRoom(roomId);

        // 찌거기 클리어링 (db에는 없는데 서버메모리에는 남아있는 경우)
        if (room == null) {
            roomStateService.removeRoom(roomId);
            return;
        }

        // 서버메모리에는 없는데 db에는 남아있는 경우
        if (roomState == null) {
            roomRepository.delete(room);
            return;
        }

        // TODO: 방장이 나갈때 위임 기능 추가 필요
        synchronized (roomState) {

            // roomState에서 해당 멤버가 없는 경우 그냥 리턴
            if (roomState.getPlayer(memberId) == null) {
                return;
            }

            roomStateService.removePlayerFromRoom(roomId, memberId);

            // 방에 아무도 남아있지 않을 경우 방 삭제
            RoomState updatedState = roomStateService.getRoom(roomId);
            if (updatedState == null || updatedState.getPlayers().isEmpty()) {
                roomRepository.delete(room); // DB에서 방 삭제
                roomStateService.removeRoom(roomId); // 서버 메모리에서 방 삭제
            }
        }
    }
}
