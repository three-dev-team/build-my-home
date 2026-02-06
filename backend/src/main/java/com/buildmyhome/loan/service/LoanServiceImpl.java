package com.buildmyhome.loan.service;

import com.buildmyhome.game.dto.GamePlayerState;
import com.buildmyhome.game.dto.GameState;
import com.buildmyhome.game.service.GameStateService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class LoanServiceImpl implements LoanService {

  private final GameStateService gameStateService;

  private static final int MAX_LOAN = 9999;

  @Override
  public void borrow(Long roomId, Long memberId, int amount, boolean isBankTile) {
    GameState gameState = gameStateService.getGame(roomId);
    // 동시성 문제 방지를 위해 각 방의 상태 객체를 동기화
    synchronized (gameState) {
      GamePlayerState playerState = gameState.getPlayers().get(memberId);

      if (playerState == null) {
        throw new IllegalArgumentException("플레이어 정보를 찾을 수 없습니다.");
      }

        int currentLoan = playerState.getLoan();

        // 이미 한도면: 신용불량자
        if (currentLoan >= MAX_LOAN) {
            throw new IllegalStateException("신용 불량자라 더 이상 대출을 받을 수 없습니다.");
        }

        // 대출 로직: 자산 증가, 대출금 증가
      // 은행 칸(isBankTile=true)이면 수수료 없음 (무이자 대출)
      // ATM 등 다른 곳(isBankTile=false)에서는 수수료 10% 추가 부채 (상시 대출) -- 추후 구현 예정
      int debtAmount = amount;
      if (!isBankTile) {
        debtAmount = (int) (amount * 1.1); // 수수료 유지
      } else {
        debtAmount = amount; // 은행에서는 원금만 갚으면 됨
      }

        // 이번 대출로 한도 초과 방지(부채 증가분 기준)
        if (currentLoan + debtAmount > MAX_LOAN) {
            throw new IllegalStateException("대출 한도(9,999벨)를 초과할 수 없습니다.");
        }

        // 한도 통과 후에만 반영(벨/대출금)
        playerState.setBell(playerState.getBell() + amount);
        playerState.setLoan(currentLoan + debtAmount);
    }
  }

  @Override
  public void repay(Long roomId, Long memberId, int amount) {
    GameState gameState = gameStateService.getGame(roomId);
    synchronized (gameState) {
      GamePlayerState playerState = gameState.getPlayers().get(memberId);

      if (playerState == null) {
        throw new IllegalArgumentException("플레이어 정보를 찾을 수 없습니다.");
      }

      int currentLoan = playerState.getLoan();
      int currentBell = playerState.getBell();

      if (currentLoan <= 0) {
        throw new IllegalStateException("갚을 빚이 없습니다.");
      }

      int repayAmount = Math.min(amount, currentLoan);

      if (currentBell < repayAmount) {
        throw new IllegalStateException("벨이 부족하여 상환할 수 없습니다.");
      }

      // 상환 로직: 벨 감소, 대출금 감소
      playerState.setBell(currentBell - repayAmount);
      playerState.setLoan(currentLoan - repayAmount);
    }
  }
}
