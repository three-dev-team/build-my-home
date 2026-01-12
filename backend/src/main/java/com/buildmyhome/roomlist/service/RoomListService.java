package com.buildmyhome.roomlist.service;

import com.buildmyhome.roomlist.dto.RoomListResponse;
import com.buildmyhome.roomlist.registry.RoomListRegistry;
import com.buildmyhome.member.entity.Member;
import com.buildmyhome.member.repository.MemberRepository;
import com.buildmyhome.room.entity.Room;
import com.buildmyhome.room.entity.Room.Status;
import com.buildmyhome.room.repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RoomListService {

    private final RoomRepository roomRepository;
    private final MemberRepository memberRepository;
    private final RoomListRegistry roomListRegistry;

    @Transactional(readOnly = true)
    public List<RoomListResponse> getRoomList() {
        List<Room> rooms = roomRepository.findByStatusInOrderByCreatedAtDesc(
                List.of(Status.WAITING, Status.PLAYING)
        );

        return rooms.stream()
                .map(room -> {
                    int cur = room.getCurrentPlayers() == null ? 0 : room.getCurrentPlayers();
                    boolean joinable =
                            room.getStatus() == Status.WAITING &&
                                    cur < room.getMaxPlayers();

                    return RoomListResponse.builder()
                            .roomId(room.getId())
                            .title(room.getTitle())
                            .currentPlayers(cur)
                            .maxPlayers(room.getMaxPlayers())
                            .totalRounds(room.getTotalRounds())
                            .joinable(joinable)
                            .hostNickname(room.getHost().getNickname())
                            .createdAt(room.getCreatedAt())
                            .build();
                })
                .toList();
    }

    @Transactional
    public Long createRoom(Long hostMemberId, String title, Integer maxPlayers, Integer totalRounds) {
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("방 제목(title)은 필수입니다.");
        }
        if (!(maxPlayers != null && (maxPlayers == 2 || maxPlayers == 3 || maxPlayers == 4))) {
            throw new IllegalArgumentException("maxPlayers는 2 ~ 4만 가능합니다.");
        }
        if (!(totalRounds != null && (totalRounds == 5 || totalRounds == 10 || totalRounds == 15 || totalRounds == 20))) {
            throw new IllegalArgumentException("totalRounds는 5/10/15/20 중 하나여야 합니다.");
        }

        Member host = memberRepository.findById(hostMemberId)
                .orElseThrow(() -> new IllegalArgumentException("호스트 회원이 존재하지 않습니다."));

        Room room = Room.builder()
                .title(title.trim())
                .maxPlayers(maxPlayers)
                .currentPlayers(1)
                .status(Status.WAITING)
                .totalRounds(totalRounds)
                .host(host)
                .build();

        Room saved = roomRepository.save(room);

        roomListRegistry.addMember(saved.getId(), hostMemberId);

        return saved.getId();
    }

    @Transactional
    public void joinRoom(Long memberId, Long roomId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 방입니다."));

        if (room.getStatus() != Status.WAITING) {
            throw new IllegalStateException("게임 중인 방에는 입장할 수 없습니다.");
        }

        if (roomListRegistry.hasMember(roomId, memberId)) {
            return;
        }

        int cur = room.getCurrentPlayers() == null ? 0 : room.getCurrentPlayers();
        if (cur >= room.getMaxPlayers()) {
            throw new IllegalStateException("정원이 가득 찼습니다.");
        }
        
        int size = roomListRegistry.addMember(roomId, memberId);
        if (size > room.getMaxPlayers()) {
            roomListRegistry.removeMember(roomId, memberId);
            throw new IllegalStateException("정원이 가득 찼습니다.");
        }

        room.setCurrentPlayers(size);
        roomRepository.save(room);
    }

    @Transactional
    public void leaveRoom(Long memberId, Long roomId) {
        Room room = roomRepository.findById(roomId).orElse(null);
        if (room == null) {
            roomListRegistry.clearRoom(roomId);
            return;
        }

        if (!roomListRegistry.hasMember(roomId, memberId)) {
            return;
        }

        int size = roomListRegistry.removeMember(roomId, memberId);

        if (size <= 0) {
            roomRepository.delete(room);
            roomListRegistry.clearRoom(roomId);
            return;
        }

        room.setCurrentPlayers(size);
        roomRepository.save(room);
    }
}
