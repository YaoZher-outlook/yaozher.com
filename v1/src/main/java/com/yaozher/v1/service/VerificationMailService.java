package com.yaozher.v1.service;

public interface VerificationMailService {

    void sendCode(String email, String code, VerificationCodePurpose purpose);
}
