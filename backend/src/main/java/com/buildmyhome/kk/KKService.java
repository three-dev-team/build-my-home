package com.buildmyhome.kk;

import com.buildmyhome.game.dto.GamePlayerState;
import org.springframework.stereotype.Service;

import static com.buildmyhome.game.constants.GameConstants.KK_ENTRY_FEE;
import static com.buildmyhome.game.constants.GameConstants.KK_SONG_COUNT;

@Service
public class KKService {

    public void payEntryFee(GamePlayerState player, int requestSongId) {
        int songId = requestSongId;
        if(requestSongId == 0) {
            songId = (int)(Math.random() * KK_SONG_COUNT) + 1;
        }

        player.setActionData(songId);

        int fee = KK_ENTRY_FEE;
        int userBell = player.getBell();

        if (userBell >= fee) {
            player.setBell(userBell - fee);
        } else {
            int needLoan = fee - userBell;
            player.setBell(0);
            player.setLoan(player.getLoan() + needLoan);
        }
    }
}
