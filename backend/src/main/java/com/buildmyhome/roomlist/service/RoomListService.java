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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class RoomListService {

    private final RoomRepository roomRepository;
    private final MemberRepository memberRepository;
    private final RoomStateService roomStateService;

    // 방 검사 메소드
    private void validateRoomSettings(String title, Integer maxPlayers, Integer totalRounds) {
        if (title == null || title.isBlank()) throw new IllegalArgumentException("방 제목은 필수입니다.");
        if (!List.of(2, 3, 4).contains(maxPlayers)) throw new IllegalArgumentException("인원 설정이 잘못되었습니다.");
        if (!List.of(5, 10, 15, 20).contains(totalRounds)) throw new IllegalArgumentException("라운드 설정이 잘못되었습니다.");
    }

    @Transactional(readOnly = true)
    public List<RoomListResponse> getRoomList() {

        // 현재 WAITING 또는 PLAYING 상태인 방들을 생성일시 내림차순으로 조회
        List<Room> rooms = roomRepository.findByStatusInOrderByCreatedAtDesc(
                List.of(Status.WAITING, Status.PLAYING)
        );

        // 성능 최적화
        Map<Long, RoomState> allStates = roomStateService.getAllRoomStates();

        // Room -> RoomListResponse
        return rooms.stream()
                .map(room -> {
                    RoomState roomState = allStates.get(room.getId());
                    int cur = (roomState != null) ? roomState.getPlayers().size() : 0; // 현재 접속한 플레이어 수

                    // 방장 정보
                    String hostNickname = (roomState != null) ? roomState.getHostNickname() : "";

                    // 방이 입장 가능한지 여부 계산 (Waiting 상태이고 현재 인원이 최대 인원보다 적은 경우)
                    boolean joinable = room.getStatus() == Status.WAITING && cur < room.getMaxPlayers();

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
                })
                .toList();
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
