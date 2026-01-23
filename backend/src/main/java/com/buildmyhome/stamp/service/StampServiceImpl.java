package com.buildmyhome.stamp.service;

import static com.buildmyhome.game.constants.GameConstants.STAMP_DUPLICATE_REWARD;
import static com.buildmyhome.game.constants.GameConstants.STAMP_REWARDS;

import com.buildmyhome.game.constants.BoardData;
import com.buildmyhome.game.constants.TileType;
import com.buildmyhome.game.dto.GamePlayerState;
import com.buildmyhome.game.dto.StampType;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class StampServiceImpl implements StampService {

  @Override
  public boolean collectStamp(GamePlayerState player, String frontStampType) {
    TileType tile = BoardData.getTileType(player.getPosition());

    if (tile == null || !tile.name().startsWith("STAMP_")) {
      System.out.println(">>> [ERROR] 스탬프 칸이 아닌 곳에서 요청됨: " + player.getPosition());
      return false;
    }

    String serverStampType = tile.name().replace("STAMP_", "");
    if (!serverStampType.equalsIgnoreCase(frontStampType)) {
      System.out.println(">>> [WARN] 타입 불일치! 서버 계산: " + serverStampType + ", 프론트 전송: " + frontStampType);
    }

    StampType stampType = StampType.valueOf(serverStampType);
    Set<StampType> collectedStamps = player.getCollectedStamps();

    // 이미 가진 스탬프면 중복 보상
    if (collectedStamps.contains(stampType)) {
      player.setBell(player.getBell() + STAMP_DUPLICATE_REWARD);
      player.setActionData(0); // 중복
      return false;
    }

    // 새 스탬프 획득
    collectedStamps.add(stampType);
    player.setActionData(1); // 신규
    return true;
  }

  @Override
  public int exchangeStamps(GamePlayerState player) {
    // [방어 코드] 스탬프가 없으면 정산 진행 안 함
    if (player.getCollectedStamps() == null || player.getCollectedStamps().isEmpty()) {
      return 0;
    }

    int stampCount = player.getCollectedStamps().size();
    int reward = STAMP_REWARDS[Math.min(stampCount, STAMP_REWARDS.length - 1)];

    // 벨 지급
    player.setBell(player.getBell() + reward);

    // 스탬프 초기화
    player.getCollectedStamps().clear();

    return reward;
  }
}
