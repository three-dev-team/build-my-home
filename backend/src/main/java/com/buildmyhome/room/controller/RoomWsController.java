package com.buildmyhome.room.controller;

import com.buildmyhome.room.dto.RoomMessage;
import com.buildmyhome.room.dto.RoomPlayerState;
import com.buildmyhome.room.dto.RoomState;
import com.buildmyhome.room.service.RoomStateService;
import com.buildmyhome.roomlist.service.RoomListService;
import java.security.Principal;
import java.util.ArrayList;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
public class RoomWsController {

  private final SimpMessagingTemplate messagingTemplate;
  private final RoomStateService roomStateService;
  private final RoomListService roomListService;

  @MessageMapping("/rooms/select-character")
  public void selectCharacter(RoomMessage message, Principal principal) {
    Long memberId = Long.parseLong(principal.getName());
    RoomState room = roomStateService.getRoom(message.getRoomId());

    if (room != null) {
      synchronized (room) {
        // 이미 선택된 캐릭터인지 확인
        if (room.isCharacterSelected(message.getCharacterId())) {
          return;
        }
        RoomPlayerState player = room.getPlayer(memberId);

        if (player != null) {
          // [Added] 준비 상태에서는 캐릭터 변경 불가
          if (player.isReady()) {
            return;
          }

          player.setCharacterId(message.getCharacterId());
          // 플레이어 추가 후 캐릭터 선택 메시지 브로드캐스트
          message.setType("CHARACTER_SELECT");
          message.setMemberId(memberId);

          message.setPlayers(room.getPlayers().values().stream().toList());
          message.setTotalRounds(room.getTotalRounds()); // 판수 전달

          messagingTemplate.convertAndSend("/topic/rooms/" + message.getRoomId(), message);
        }
      }
    }
  }

  @MessageMapping("/rooms/get-players")
  public void getPlayers(RoomMessage message) {
    // 현재 메시지에 roomId만 존재
    // 선택된 roomId에 담긴 룸 정보 가져오기
    RoomState room = roomStateService.getRoom(message.getRoomId());
    message.setType("ROOM_STATE");
    if (room != null) {
      message.setPlayers(room.getPlayers().values().stream().toList());
      message.setAutoStartTime(room.getAutoStartTime());
      message.setMaxPlayers(room.getMaxPlayers());
      message.setTotalRounds(room.getTotalRounds());
      message.setLockedSlots(room.getLockedSlots()); // 잠긴 슬롯 전달
    } else {
      message.setPlayers(new ArrayList<>());
    }
    messagingTemplate.convertAndSend("/topic/rooms/" + message.getRoomId(), message);
  }

  // [Added] 방 입장 처리 - 캐릭터 선택 전에 플레이어를 방에 추가
  @MessageMapping("/rooms/enter")
  public void enterRoom(RoomMessage message, Principal principal) {
    Long memberId = Long.parseLong(principal.getName());
    Long roomId = message.getRoomId();
    RoomState room = roomStateService.getRoom(roomId);

    if (room == null) return;

    synchronized (room) {
      // 이미 입장한 경우 무시
      if (room.getPlayer(memberId) != null) return;

      // 열린 슬롯이 있는지 확인
      int openSlots = 4 - room.getLockedSlots().size();
      if (room.getPlayers().size() >= openSlots) return;

      // 닉네임 조회
      String nickname = roomListService.getNicknameByMemberId(memberId);

      // 플레이어 정보 생성 및 추가
      RoomPlayerState player = new RoomPlayerState();
      player.setMemberId(memberId);
      player.setNickname(nickname);
      player.setReady(false);
      roomStateService.addPlayerToRoom(roomId, player);

      // 브로드캐스트
      message.setType("PLAYER_JOINED");
      message.setMemberId(memberId);
      message.setPlayers(room.getPlayers().values().stream().toList());
      message.setTotalRounds(room.getTotalRounds());
      message.setLockedSlots(room.getLockedSlots());

      messagingTemplate.convertAndSend("/topic/rooms/" + roomId, message);
    }
  }

  @MessageMapping("/rooms/leave")
  public void leaveRoom(RoomMessage message, Principal principal) {
    Long memberId = Long.parseLong(principal.getName());
    Long roomId = message.getRoomId();
    RoomState room = roomStateService.getRoom(roomId);

    // 삭제하기 전에 플레이어 정보 세팅 (닉네임, 캐릭터 아이디) -> 나중에 개별 브로드캐스트 할 일이 있을 수도 있어서
    // ex 곰돌님 (캐릭터 애플이)이 나갔습니다 메시지 토스트
    if (room != null) {
      RoomPlayerState player = room.getPlayer(memberId);
      if (player != null) {
        message.setMemberId(memberId);
        message.setNickname(player.getNickname());
        message.setCharacterId(player.getCharacterId());
      }
    }

    // 방 나가기 처리
    roomListService.leaveRoom(memberId, message.getRoomId());

    RoomState updatedRoom = roomStateService.getRoom(roomId);
    message.setType("PLAYER_LEAVE");

    if (updatedRoom != null) {
      // [Added] 퇴장으로 인해 자동 시작 조건 깨짐 체크
      boolean isFull = updatedRoom.getPlayers().size() >= (4 - updatedRoom.getLockedSlots().size());
      boolean allReady = updatedRoom.getPlayers().values().stream()
              .filter(p -> p.getNickname() != null)
              .allMatch(RoomPlayerState::isReady);
      
      if (!isFull || !allReady) {
         updatedRoom.setAutoStartTime(null);
      }
      
      message.setPlayers(updatedRoom.getPlayers().values().stream().toList());
      message.setAutoStartTime(updatedRoom.getAutoStartTime()); // 갱신된 시간(null) 전송
      message.setTotalRounds(updatedRoom.getTotalRounds()); // 판수 전달
    } else {
      message.setPlayers(new ArrayList<>());
    }
    messagingTemplate.convertAndSend("/topic/rooms/" + roomId, message);
  }

  @MessageMapping("/rooms/ready")
  public void toggleReady(RoomMessage message, Principal principal) {
    // roomId(message), memberId(principal)
    Long memberId = Long.parseLong(principal.getName());
    Long roomId = message.getRoomId();
    RoomState room = roomStateService.getRoom(message.getRoomId());
    if (room != null) {
      synchronized (room) {
        RoomPlayerState player = room.getPlayer(memberId);
        if (player != null) {
          player.setReady(!player.isReady()); // 서버 메모리에 저장
          
          // [Added] 전원 준비 확인 및 자동 시작 타이머 설정
          boolean allReady = room.getPlayers().values().stream()
              .filter(p -> p.getNickname() != null) // 닉네임 있는(참여한) 플레이어만
              .allMatch(RoomPlayerState::isReady);

           // [Modified] 열린 슬롯(잠기지 않은 슬롯)이 모두 채워졌는지 확인
           int openSlots = 4 - room.getLockedSlots().size(); // 4인방 기준
           boolean isFull = room.getPlayers().size() >= openSlots && openSlots >= 2; // 최소 2인 이상
           System.out.println("DEBUG: AutoStart Check [Room " + roomId + "] players=" + room.getPlayers().size() + ", openSlots=" + openSlots + ", allReady=" + allReady + ", isFull=" + isFull);

            if (allReady && isFull) {
             // [Modified] 13초 시퀀스 적용
             // 1. 5초 대기
             // 2. 5초 방장 카운트
             // 3. 3초 전체 카운트
             // Total: 13000ms
             room.setAutoStartTime(System.currentTimeMillis() + 13000); 
          } else {
             room.setAutoStartTime(null);
          }

          message.setType("PLAYER_READY");
          message.setMemberId(memberId);
          message.setAutoStartTime(room.getAutoStartTime()); // 메시지에 담아서 전송
          message.setPlayers(room.getPlayers().values().stream().toList());
          message.setTotalRounds(room.getTotalRounds()); // 판수 전달

          messagingTemplate.convertAndSend("/topic/rooms/" + roomId, message);
        }
      }
    }
  }

  @MessageMapping("/rooms/delegate-host")
  public void delegateHost(RoomMessage message, Principal principal) {
    Long currentHostId = Long.parseLong(principal.getName());
    Long roomId = message.getRoomId();
    Long newHostId = message.getMemberId(); // 위임받을 대상 ID

    try {
      roomStateService.delegateHost(roomId, currentHostId, newHostId);

      // 변경된 방 상태 브로드캐스트
      RoomState room = roomStateService.getRoom(roomId);
      if (room != null) {
        message.setType("HOST_DELEGATED");
        message.setPlayers(room.getPlayers().values().stream().toList());
        message.setTotalRounds(room.getTotalRounds()); // 판수 전달
        messagingTemplate.convertAndSend("/topic/rooms/" + roomId, message);
      }
    } catch (IllegalStateException e) {
      System.err.println("Delegate failed: " + e.getMessage());
    }
  }
  @MessageMapping("/rooms/start-timer")
  public void forceStartTimer(RoomMessage message, Principal principal) {
    Long roomId = message.getRoomId();
    RoomState room = roomStateService.getRoom(roomId);
    if (room != null) {
      synchronized (room) {
        // if (!isHost(room, principal)) return; 
        
        // [New] 시작 버튼 누르면 즉시 방 상태를 PLAYING으로 변경 (입장 불가)
        roomListService.startGame(roomId);

        // [Modified] 강제 시작은 전체 카운트 3초만 수행
        room.setAutoStartTime(System.currentTimeMillis() + 3000);
        
        message.setType("ROOM_STATE_UPDATE"); // 또는 PLAYER_READY 등 클라이언트가 인식 가능한 타입
        // getPlayers와 동일한 포맷으로 전송
        message.setPlayers(room.getPlayers().values().stream().toList());
        message.setAutoStartTime(room.getAutoStartTime());
        message.setTotalRounds(room.getTotalRounds()); // 판수 전달
        
        messagingTemplate.convertAndSend("/topic/rooms/" + roomId, message);
        System.out.println(">>> ⏳ Force Start Timer: 5 seconds");
      }
    }
  }

  @MessageMapping("/rooms/update-settings")
  public void updateSettings(RoomMessage message, Principal principal) {
    Long roomId = message.getRoomId();
    Integer newMax = message.getMaxPlayers();
    Integer newRounds = message.getTotalRounds();

    // 둘 다 없으면 리턴
    if (newMax == null && newRounds == null) return;

    RoomState room = roomStateService.getRoom(roomId);
    if (room == null) return;

    synchronized (room) {
        try {
          // maxPlayers 업데이트
          if (newMax != null) {
            roomListService.updateMaxPlayers(roomId, newMax);
          }
          
          // totalRounds 업데이트 (새로 추가)
          if (newRounds != null) {
            roomListService.updateTotalRounds(roomId, newRounds);
          }

          // 브로드캐스트
          // [Modified] 설정 변경 시에도 자동 시작 조건 재확인 (설정 변경으로 인원수 조건이 깨질 수 있음)
          boolean isFull = room.getPlayers().size() >= (4 - room.getLockedSlots().size());
          boolean allReady = room.getPlayers().values().stream()
              .filter(p -> p.getNickname() != null)
              .allMatch(RoomPlayerState::isReady);

          if (!isFull || !allReady) {
             room.setAutoStartTime(null); // 조건 깨지면 카운트 중지
             System.out.println(">>> 🛑 AutoStart Cancelled by Settings Update: isFull=" + isFull + ", allReady=" + allReady);
          } else if (isFull && allReady && room.getAutoStartTime() == null) {
             room.setAutoStartTime(System.currentTimeMillis() + 13000);
          }

          message.setType("ROOM_SETTINGS_UPDATE");
          message.setPlayers(room.getPlayers().values().stream().toList());
          message.setAutoStartTime(room.getAutoStartTime());
          message.setMaxPlayers(room.getMaxPlayers());
          message.setTotalRounds(room.getTotalRounds()); // 추가

          messagingTemplate.convertAndSend("/topic/rooms/" + roomId, message);
          System.out.println(">>> ⚙️ Room Settings Updated: MaxPlayers=" + newMax + ", TotalRounds=" + newRounds);
        } catch (Exception e) {
          System.err.println("Failed to update settings: " + e.getMessage());
          // 에러 메시지 전송 로직 추가 가능
        }
    }
  }

  @MessageMapping("/rooms/kick")
  public void kickPlayer(RoomMessage message, Principal principal) {
    Long requesterId = Long.parseLong(principal.getName());
    Long roomId = message.getRoomId();
    Long targetId = message.getMemberId(); // 강퇴 대상

    RoomState room = roomStateService.getRoom(roomId);
    if (room == null || targetId == null) return;

    synchronized (room) {
      RoomPlayerState host = room.getPlayer(requesterId);
      RoomPlayerState target = room.getPlayer(targetId);

      // 권한 검증: 요청자가 호스트여야 함 & 대상이 존재해야 함 & 자기 자신 강퇴 불가
      if (host == null || !host.isHost() || target == null || targetId.equals(requesterId)) {
        return;
      }

      // 강퇴 처리 (방 나가기와 동일한 로직 호출)
      roomListService.leaveRoom(targetId, roomId);

      // 강퇴 당한 사람 정보 포함하여 브로드캐스트
      message.setType("PLAYER_KICKED");
      message.setMemberId(targetId);
      message.setNickname(target.getNickname());
      
      // 갱신된 플레이어 목록 전송
      RoomState updatedRoom = roomStateService.getRoom(roomId);
      if (updatedRoom != null) {
         // [Added] 강퇴로 인해 자동 시작 조건 깨짐 체크
         boolean isFull = updatedRoom.getPlayers().size() >= (4 - updatedRoom.getLockedSlots().size());
         boolean allReady = updatedRoom.getPlayers().values().stream()
                 .filter(p -> p.getNickname() != null)
                 .allMatch(RoomPlayerState::isReady);
         
         if (!isFull || !allReady) {
            updatedRoom.setAutoStartTime(null);
         }

        message.setPlayers(updatedRoom.getPlayers().values().stream().toList());
        message.setAutoStartTime(updatedRoom.getAutoStartTime());
        message.setTotalRounds(updatedRoom.getTotalRounds()); // 판수 전달
      } else {
        message.setPlayers(new ArrayList<>());
      }
      
      messagingTemplate.convertAndSend("/topic/rooms/" + roomId, message);
      System.out.println(">>> 🦶 Player Kicked: " + target.getNickname());
    }
  }

  @MessageMapping("/rooms/chat")
  public void chat(RoomMessage message, Principal principal) {
    Long memberId = Long.parseLong(principal.getName());
    // 메시지 내용 검증 (너무 길거나 비어있으면 무시)
    if (message.getMessage() == null || message.getMessage().trim().isEmpty()) {
      return;
    }
    
    // 보낸 사람 정보 세팅
    message.setMemberId(memberId);
    message.setType("CHAT");

    // [Added] 판수 정보 유지
    RoomState room = roomStateService.getRoom(message.getRoomId());
    if (room != null) {
        message.setTotalRounds(room.getTotalRounds());
    }
    
    // 방에 있는 모든 사람에게 전송
    messagingTemplate.convertAndSend("/topic/rooms/" + message.getRoomId(), message);
    System.out.println(">>> 💬 Chat: [" + message.getRoomId() + "] " + memberId + ": " + message.getMessage());
  }

  @MessageMapping("/rooms/move-seat")
  public void moveSeat(RoomMessage message, Principal principal) {
    Long memberId = Long.parseLong(principal.getName());
    Long roomId = message.getRoomId();
    Integer targetIndex = message.getTargetIndex(); // 이동할 자리 인덱스 (0-based)

    RoomState room = roomStateService.getRoom(roomId);
    if (room == null || targetIndex == null) return;

    synchronized (room) {
      RoomPlayerState player = room.getPlayer(memberId);
      if (player == null) return;

      // 준비 상태에서는 자리 이동 불가
      if (player.isReady()) return;

      // 대상 자리가 잠긴 자리인지 확인
      if (room.isSlotLocked(targetIndex + 1)) return;

      // 대상 자리가 비어있는지 확인
      boolean isTargetEmpty = room.getPlayers().values().stream()
          .noneMatch(p -> p.getIndex() != null && p.getIndex() == targetIndex + 1);

      if (!isTargetEmpty) return;

      // 자리 이동 실행
      player.setIndex(targetIndex + 1);

      message.setType("PLAYER_MOVED");
      message.setMemberId(memberId);
      message.setPlayers(room.getPlayers().values().stream().toList());
      message.setTotalRounds(room.getTotalRounds());

      messagingTemplate.convertAndSend("/topic/rooms/" + roomId, message);
      System.out.println(">>> 🪑 Player Moved: " + player.getNickname() + " -> Seat " + (targetIndex + 1));
    }
  }

  @MessageMapping("/rooms/toggle-lock")
  public void toggleLock(RoomMessage message, Principal principal) {
    Long memberId = Long.parseLong(principal.getName());
    Long roomId = message.getRoomId();
    Integer slotIndex = message.getSlotIndex(); // 잠금할 슬롯 인덱스 (1-based)

    RoomState room = roomStateService.getRoom(roomId);
    if (room == null || slotIndex == null) return;

    synchronized (room) {
      RoomPlayerState player = room.getPlayer(memberId);
      if (player == null || !player.isHost()) return; // 방장만 잠금 가능

      // 해당 슬롯에 플레이어가 있으면 잠금 불가
      boolean hasPlayer = room.getPlayers().values().stream()
          .anyMatch(p -> p.getIndex() != null && p.getIndex().equals(slotIndex));
      if (hasPlayer) return;

      // 잠금 시 열린 슬롯이 최소 2개 이상 유지되어야 함
      int openSlots = 4 - room.getLockedSlots().size();
      boolean isCurrentlyLocked = room.isSlotLocked(slotIndex);
      if (!isCurrentlyLocked && openSlots <= 2) return; // 잠금 추가 시 2개 이하면 불가

      // 잠금 토글
      boolean isLocked = room.toggleLock(slotIndex);

      message.setType("SLOT_LOCK_UPDATE");
      message.setSlotIndex(slotIndex);
      message.setLockedSlots(room.getLockedSlots());
      message.setPlayers(room.getPlayers().values().stream().toList());
      message.setTotalRounds(room.getTotalRounds());

      messagingTemplate.convertAndSend("/topic/rooms/" + roomId, message);
      System.out.println(">>> 🔒 Slot " + slotIndex + " " + (isLocked ? "Locked" : "Unlocked"));
    }
  }
}
