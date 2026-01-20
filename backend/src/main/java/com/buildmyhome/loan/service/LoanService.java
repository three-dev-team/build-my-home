package com.buildmyhome.loan.service;

import com.buildmyhome.loan.dto.LoanMessage;

public interface LoanService {
    void borrow(LoanMessage message);
    void repay(LoanMessage message);
}
