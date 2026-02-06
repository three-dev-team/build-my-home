package com.buildmyhome.room.repository;

import com.buildmyhome.room.entity.Room;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoomRepository extends JpaRepository<Room, Long> {
  // WAITING 방의 id 범위(최소/최대)를 구함 (ORDER BY id ASC/DESC)
  Optional<Room> findFirstByStatusOrderByIdAsc(Room.Status status);
  Optional<Room> findFirstByStatusOrderByIdDesc(Room.Status status);

  // 랜덤 기준점(startId)부터 위로 size개 (PK 인덱스 범위조회)
  List<Room> findByStatusAndIdGreaterThanEqualOrderByIdAsc(Room.Status status, Long id, Pageable pageable);

  // 위에서 size가 안 찼을 때, 아래쪽(작은 id)에서 이어서 채움(랩어라운드)
  List<Room> findByStatusAndIdLessThanOrderByIdAsc(Room.Status status, Long id, Pageable pageable);

  // 스케줄러/관리용: 특정 상태 방 전체 조회
  List<Room> findByStatusIn(List<Room.Status> statuses);

  // 제목 검색 (정확히 일치, 최신순)
  List<Room> findByStatusAndTitleOrderByIdDesc(Room.Status status, String title, Pageable pageable);

  // 초대 코드로 방 조회
  Optional<Room> findByInviteCode(String inviteCode);
}
