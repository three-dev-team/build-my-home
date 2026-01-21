package com.buildmyhome.stamp.service;

import com.buildmyhome.game.dto.GamePlayerState;
import com.buildmyhome.game.dto.GameState;
import com.buildmyhome.game.dto.StampType;
import com.buildmyhome.game.service.GameStateService;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Set;

@Service
@RequiredArgsConstructor
public class StampServiceImpl implements StampService {

    private final GameStateService gameStateService;

    @Override
    public void acquireStamp(Long roomId, Long memberId, String stampType) {
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
                
                // 서비스에서는 상태만 변경하고 리턴.
                // 필요한 경우 리턴 타입을 StampType으로 변경하여 컨트롤러에 전달할 수 있음.
            }
        }
    }
}
