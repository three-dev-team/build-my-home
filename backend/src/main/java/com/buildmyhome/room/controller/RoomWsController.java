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
      message.setTotalRounds(room.getTotalRounds()); // 판수 전달
    } else {
      message.setPlayers(new ArrayList<>());
    }
    messagingTemplate.convertAndSend("/topic/rooms/" + message.getRoomId(), message);
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
      boolean isFull = updatedRoom.getPlayers().size() >= updatedRoom.getMaxPlayers();
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


           // [Modified] 인원수가 꽉 차고 + 모두 준비 완료 시에만 자동 시작
           boolean isFull = room.getPlayers().size() >= room.getMaxPlayers();
           System.out.println("DEBUG: AutoStart Check [Room " + roomId + "] players=" + room.getPlayers().size() + ", max=" + room.getMaxPlayers() + ", allReady=" + allReady + ", isFull=" + isFull);

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
          boolean isFull = room.getPlayers().size() >= room.getMaxPlayers();
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
         boolean isFull = updatedRoom.getPlayers().size() >= updatedRoom.getMaxPlayers();
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
}
