package com.buildmyhome.game.service;

import static com.buildmyhome.game.constants.GameConstants.BOARD_SIZE;

import com.buildmyhome.game.constants.BoardData;
import com.buildmyhome.game.constants.GameConstants;
import com.buildmyhome.game.constants.TileType;
import com.buildmyhome.game.dto.GamePlayerState;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;

// 이동 관련 비즈니스 로직
@Service
public class MoveServiceImpl implements MoveService {

  // 지나가기 로직이 적용되는 타일
  private static final Set<TileType> STOP_POINTS = Set.of(TileType.START, TileType.SHOP);

  @Override
  public void movePlayer(GamePlayerState player, int diceValue) {
    int currentPosition = player.getPosition();
    List<Integer> movePath = new ArrayList<>();

    movePath.add(currentPosition);

    // 1칸씩 전진하며 중간에 멈춰야 할 칸이 있는지 확인
    for (int i = 1; i <= diceValue; i++) {
      int checkPosition = (currentPosition + i) % GameConstants.BOARD_SIZE; // 한 칸씩 이동한 포지션
      movePath.add(checkPosition);
      TileType tile = BoardData.getTileType(checkPosition); // 해당 포지션의 타일 타입 확인

      // 중간에 멈춰야 할 칸(START 등)을 만난 경우
      if (STOP_POINTS.contains(tile) && i < diceValue) {
//        player.setPosition(checkPosition);
        player.setRemainingMoves(diceValue - i);
        player.setMovePath(movePath);
        return; // 중간 지점에서 정지
      }
    }

    // 최종 위치 도착
//    player.setPosition((currentPosition + diceValue) % BOARD_SIZE);
    player.setRemainingMoves(0);
    player.setMovePath(movePath);
  }
}
