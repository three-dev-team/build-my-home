package com.buildmyhome.loan.service;

public interface LoanService {
    void borrow(Long roomId, Long memberId, int amount, boolean isBankTile);
    void repay(Long roomId, Long memberId, int amount);
}
