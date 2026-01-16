package com.buildmyhome.roomlist.scheduler;

import com.buildmyhome.room.dto.RoomState;
import com.buildmyhome.room.entity.Room;
import com.buildmyhome.room.repository.RoomRepository;
import com.buildmyhome.room.service.RoomStateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

// 찌꺼기 방 제거
@Slf4j
@Component
@RequiredArgsConstructor
public class RoomCleanupScheduler {

    private final RoomRepository roomRepository;
    private final RoomStateService roomStateService;

    // DB만 남고 메모리(RoomState)에 없는 방을 즉시 삭제시 타이밍차로 오탐될 수 있어 안전하게 유예 시간을 둠(2분)
    private static final Duration ORPHAN_DB_ROOM_GRACE = Duration.ofMinutes(2);

    // 대기방을 장시간 방치되면 목록에 찌꺼기로 남기 쉬움 -> 방장 혼자 or 비정상적으로 인원 동기화가 안된 방 정리 대상(2시간)
    private static final Duration MAX_WAITING_AGE = Duration.ofHours(2);

    // 진행중 방이 장시간 방치되면 DB/메모리 누수로 이어질 수 있음(12시간)
    private static final Duration MAX_PLAYING_AGE = Duration.ofHours(12);

    // 기본 : 1분마다 실행
    // - fixedDelay : 이전 실행이 끝난 뒤 N ms 후 실행 (동시 실행 방지에 유리)
    @Scheduled(fixedDelayString = "${room.cleanup.fixed-delay-ms:60000}")
    @Transactional
    public void cleanupRooms() {
        // 메모리(RoomState)에는 있는데 DB에는 없는 찌거기 정리
        int removedOrphanStates = cleanupOrphanRoomStates();

        // DB에 남아있는 WAITING/PLAYING 방들 대상으로 정리
        List<Room> rooms = roomRepository.findByStatusIn(List.of(Room.Status.WAITING, Room.Status.PLAYING));

        // 기준 시각 통일
        LocalDateTime now = LocalDateTime.now();

        // 로그용 - 삭제된 방 개수 확인용
        int deletedDbRooms = 0;
        int deletedMemoryRooms = 0;

        for (Room room : rooms) {
            Long roomId = room.getId();
            RoomState roomState = roomStateService.getRoom(roomId);

            // createdAt/updatedAt이 null이면(비정상) 오래된 것으로 보고 정리 대상으로 취급
            LocalDateTime lastTouched = room.getUpdatedAt() != null ? room.getUpdatedAt() : room.getCreatedAt();
            Duration age = (lastTouched == null) ? Duration.ofDays(3650) : Duration.between(lastTouched, now);

            // DB는 있는데 메모리(RoomState)가 없으면(서버 재시작/메모리 유실) 입장 불가
            // -> 바로 삭제하지 않고 유예 시간 이후에만 삭제
            if (roomState == null) {
                if (age.compareTo(ORPHAN_DB_ROOM_GRACE) > 0) {
                    roomRepository.delete(room);
                    deletedDbRooms++;
                }
                continue;
            }

            int playerCount = (roomState.getPlayers() == null) ? 0 : roomState.getPlayers().size();

            // 빈 방: 메모리 기준 플레이어 0명 => DB/메모리 둘 다 제거
            if (playerCount <= 0) {
                roomRepository.delete(room);
                roomStateService.removeRoom(roomId);
                deletedDbRooms++;
                deletedMemoryRooms++;
                continue;
            }

            // 오래된 대기방: WAITING인데 너무 오래되고(방장 혼자 남은 경우) 정리
            if (room.getStatus() == Room.Status.WAITING
                    && playerCount <= 1
                    && age.compareTo(MAX_WAITING_AGE) > 0) {
                roomRepository.delete(room);
                roomStateService.removeRoom(roomId);
                deletedDbRooms++;
                deletedMemoryRooms++;
                continue;
            }

            // 오래된 진행방: PLAYING이 장시간 지속되면 비정상 가능성이 높아서 안전장치로 정리
            if (room.getStatus() == Room.Status.PLAYING
                    && age.compareTo(MAX_PLAYING_AGE) > 0) {
                roomRepository.delete(room);
                roomStateService.removeRoom(roomId);
                deletedDbRooms++;
                deletedMemoryRooms++;
            }
        }

        // 방 삭제 일어나면 로그에 찍힘
        if (removedOrphanStates > 0 || deletedDbRooms > 0 || deletedMemoryRooms > 0) {
            log.info("[RoomCleanup] summary: orphanStatesRemoved={}, dbDeleted={}, memoryDeleted={}",
                    removedOrphanStates, deletedDbRooms, deletedMemoryRooms);
        }
    }

    // 서버 메모리(RoomState)에는 존재, DB(Room 테이블)에는 존재X -> 메모리에서 지워서 누수/오동작을 막음
    private int cleanupOrphanRoomStates() {
        Map<Long, RoomState> states = roomStateService.getAllRoomStates();
        if (states.isEmpty()) return 0;

        int removed = 0;
        for (Long roomId : states.keySet()) {
            if (!roomRepository.existsById(roomId)) {
                roomStateService.removeRoom(roomId);
                removed++;
            }
        }
        return removed;
    }
}
