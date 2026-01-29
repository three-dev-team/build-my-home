package com.buildmyhome.machurilla.service;

import com.buildmyhome.game.dto.GamePlayerState;
import com.buildmyhome.game.dto.GameState;
import com.buildmyhome.house.constants.HouseLevel;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

import static com.buildmyhome.game.constants.GameConstants.CARD_TYPES;
import static com.buildmyhome.game.constants.GameConstants.MACHURILLA_FRIENDSHIP_BELL;

@Service
public class MachurillaServiceImpl implements MachurillaService {

    private boolean randomTrueFalse() {
        return ThreadLocalRandom.current().nextBoolean();
    }

    private String selectRandomCard() {
        int rand = ThreadLocalRandom.current().nextInt(100);

        if (rand < 25) return "MONEY";        // 0-24: 25%
        if (rand < 40) return "PROPERTY";     // 24-39: 15%
        if (rand < 75) return "HEALTH";       // 40-74: 35%
        return "FRIENDSHIP";                   // 75-99: 25%
    }

    @Override
    public void applyCardEffect(GameState gameState, GamePlayerState player) {
        String card = selectRandomCard();
        boolean isUp = randomTrueFalse(); // 50% 확률로 상승/하락 결정

        switch (card) {
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

        player.setActionDataStr(card + "_" + (isUp ? "UP" : "DOWN"));
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
            player.setSkipNextTurnCount(player.getSkipNextTurnCount() + 1);
        }
    }

    // 우정운: 상승 = 우정을 위해 베풀기(돈 나감), 하락 = 탐욕으로 민심 잃기(돈 뺏음)
    private void applyFriendshipCard(GameState gameState, GamePlayerState player, boolean isUp) {
        int amount = MACHURILLA_FRIENDSHIP_BELL;
        List<GamePlayerState> others = gameState.getPlayers().values().stream()
                .filter(p -> !p.getMemberId().equals(player.getMemberId()))
                .toList();

        if (isUp) {
            // [상승] 우정을 위해 베풀기: 내 돈을 다른 유저에게 나눠줌
            int totalToGive = amount * others.size();
            int myBell = player.getBell();

            if (myBell >= totalToGive) {
                // 돈이 충분할 때: 각자에게 정해진 금액(100벨)씩 베풂
                for (GamePlayerState other : others) {
                    player.setBell(player.getBell() - amount);
                    other.setBell(other.getBell() + amount);
                }
            } else {
                // 돈이 부족할 때: 가진 전재산을 털어 균등하게 분배 (우정의 힘!)
                if (!others.isEmpty()) {
                    int eachGive = myBell / others.size();
                    for (GamePlayerState other : others) {
                        other.setBell(other.getBell() + eachGive);
                    }
                    player.setBell(0);
                }
            }
        } else {
            // [하락] 탐욕의 대가: 다른 유저에게서 돈을 뺏어옴 (민심 하락)
            for (GamePlayerState other : others) {
                // 상대방이 가진 돈보다 많이 뺏을 순 없으므로 Math.min 처리
                int take = Math.min(other.getBell(), amount);
                other.setBell(other.getBell() - take);
                player.setBell(player.getBell() + take);
            }
        }
    }
}
