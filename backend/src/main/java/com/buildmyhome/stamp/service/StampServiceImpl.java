package com.buildmyhome.stamp.service;

import com.buildmyhome.game.dto.GamePlayerState;
import com.buildmyhome.game.dto.GameState;
import com.buildmyhome.game.dto.StampType;
import com.buildmyhome.game.service.GameStateService;
import com.buildmyhome.stamp.dto.StampMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Set;

@Service
@RequiredArgsConstructor
public class StampServiceImpl implements StampService {

    private final GameStateService gameStateService;

    @Override
    public void acquireStamp(StampMessage message) {
        Long roomId = message.getRoomId();
        Long memberId = message.getMemberId();

        GameState gameState = gameStateService.getGame(roomId);
        synchronized (gameState) {
            GamePlayerState player = gameState.getPlayers().get(memberId);
            if (player == null) {
                throw new IllegalArgumentException("Player not found");
            }

            Set<StampType> collectedStamps = player.getCollectedStamps();
            int currentCount = collectedStamps.size();

            // 이미 4개를 다 모았다면 더 이상 획득 불가
            if (currentCount >= 4) {
                return;
            }

            // 순서대로 스탬프 지급 및 보상
            StampType nextStamp = null;
            int reward = 0;

            switch (currentCount) {
                case 0:
                    nextStamp = StampType.BLUE;
                    reward = 20;
                    break;
                case 1:
                    nextStamp = StampType.YELLOW;
                    reward = 40;
                    break;
                case 2:
                    nextStamp = StampType.RED;
                    reward = 60;
                    break;
                case 3:
                    nextStamp = StampType.GREEN;
                    reward = 100;
                    break;
            }

            if (nextStamp != null) {
                collectedStamps.add(nextStamp);
                player.setBell(player.getBell() + reward);
                
                // 메시지에 어떤 스탬프를 받았는지 정보 추가 (Controller에서 쓸 수 있게)
                message.setStampType(nextStamp.name());
            }
        }
    }
}
