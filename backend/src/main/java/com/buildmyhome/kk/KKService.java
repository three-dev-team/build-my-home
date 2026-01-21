package com.buildmyhome.kk;

import com.buildmyhome.game.dto.GamePlayerState;
import org.springframework.stereotype.Service;

import static com.buildmyhome.game.constants.GameConstants.KK_ENTRY_FEE;

@Service
public class KKService {

    public void payEntryFee(GamePlayerState player) {
        int fee = KK_ENTRY_FEE;
        int userBell = player.getBell();

        if (userBell >= fee) {
            player.setBell(userBell - fee);
        } else {
            int shortage = fee - userBell;
            player.setBell(0);
            player.setLoan(player.getLoan() + shortage);
        }
    }
}
