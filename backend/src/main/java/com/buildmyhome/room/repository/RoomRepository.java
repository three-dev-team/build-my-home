package com.buildmyhome.room.repository;

import com.buildmyhome.room.entity.Room;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RoomRepository extends JpaRepository<Room, Long> {

    // WAITING 방의 id 범위(최소/최대)를 구함 (ORDER BY id ASC/DESC)
    Optional<Room> findFirstByStatusOrderByIdAsc(Room.Status status);
    Optional<Room> findFirstByStatusOrderByIdDesc(Room.Status status);

    // 랜덤 기준점(startId)부터 위로 size개 (PK 인덱스 범위조회)
    List<Room> findByStatusAndIdGreaterThanEqualOrderByIdAsc(Room.Status status, Long id, Pageable pageable);

    // 위에서 size가 안 찼을 때, 아래쪽(작은 id)에서 이어서 채움(랩어라운드)
    List<Room> findByStatusAndIdLessThanOrderByIdAsc(Room.Status status, Long id, Pageable pageable);
}