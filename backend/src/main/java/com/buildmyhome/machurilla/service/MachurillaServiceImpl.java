package com.buildmyhome.machurilla.service;

import com.buildmyhome.game.dto.GamePlayerState;
import com.buildmyhome.game.dto.GameState;
import com.buildmyhome.house.constants.HouseLevel;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

import static com.buildmyhome.game.constants.GameConstants.MACHURILLA_FRIENDSHIP_BELL;

@Service
public class MachurillaServiceImpl implements MachurillaService {

    private boolean randomTrueFalse() {
        return ThreadLocalRandom.current().nextBoolean();
    }

    @Override
    public void applyCardEffect(GameState gameState, GamePlayerState player, String cardType) {
        boolean isUp = randomTrueFalse(); // 50% 확률로 상승/하락 결정

        switch (cardType) {
            case "MONEY":
                applyMoneyCard(player, isUp);
                break;
            case "PROPERTY":
                applyPropertyCard(player, isUp);
                break;
            case "HEALTH":
                applyHealthCard(player, isUp);
                break;
            case "FRIENDSHIP":
                applyFriendshipCard(gameState, player, isUp);
                break;
        }

        player.setActionDataStr(cardType + "_" + (isUp ? "UP" : "DOWN"));
    }

    // 금전운: 상승 = 벨 2배, 하락 = 벨 0
    private void applyMoneyCard(GamePlayerState player, boolean isUp) {
        if (isUp) {
            player.setBell(player.getBell() * 2);
        } else {
            player.setBell(0);
        }
    }

    // 재산운: 상승 = 집 +1, 하락 = 집 -1
    private void applyPropertyCard(GamePlayerState player, boolean up) {
        HouseLevel current = player.getHouseLevel();
        if (up) {
            HouseLevel next = current.getNext();
            if (next != null) {
                player.setHouseLevel(next);
            }
        } else {
            HouseLevel prev = current.getPrev();
            if (prev != null) {
                player.setHouseLevel(prev);
            }
        }
    }

    // 건강운: 상승 = 주사위 한 번 더, 하락 = 다음 턴 스킵
    private void applyHealthCard(GamePlayerState player, boolean isUp) {
        if (isUp) {
            player.setExtraDice(true);
        } else {
            player.setSkipNextTurn(true);
        }
    }

    // 우정운: 상승 = 다른 유저에게서 100벨씩 받기, 하락 = 다른 유저에게 100벨씩 주기
    private void applyFriendshipCard(GameState gameState, GamePlayerState player, boolean isUp) {
        int amount = MACHURILLA_FRIENDSHIP_BELL;

        if (isUp) {
            // 상승: 다른 유저에게서 100벨씩 받기 (상대방 돈 부족하면 전재산)
            for (GamePlayerState other : gameState.getPlayers().values()) {
                if (other.getMemberId().equals(player.getMemberId())) continue;

                int take = Math.min(other.getBell(), amount);
                other.setBell(other.getBell() - take);
                player.setBell(player.getBell() + take);
            }
        } else {
            // 하락: 다른 유저에게 100벨씩 주기 (내 돈 부족하면 전재산 나눠서)
            List<GamePlayerState> others = gameState.getPlayers().values().stream()
                    .filter(p -> !p.getMemberId().equals(player.getMemberId()))
                    .toList();

            int totalToGive = amount * others.size();  // 줘야 할 총 금액
            int myBell = player.getBell();

            if (myBell >= totalToGive) {
                // 돈 충분: 각자 100벨씩
                for (GamePlayerState other : others) {
                    player.setBell(player.getBell() - amount);
                    other.setBell(other.getBell() + amount);
                }
            } else {
                // 돈 부족: 전재산을 균등 분배
                int eachGive = myBell / others.size();
                for (GamePlayerState other : others) {
                    other.setBell(other.getBell() + eachGive);
                }
                player.setBell(myBell % others.size());  // 나머지만 남음
            }
        }
    }
}
