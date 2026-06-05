package com.yaozher.v1.service;

public interface VerificationCodeService {

    void guardEmailLookup(String email, String clientIp);

    String issue(String email, VerificationCodePurpose purpose, String scope, String clientIp);

    void verify(String email, String code, VerificationCodePurpose purpose, String scope);

    void invalidate(String email, VerificationCodePurpose purpose, String scope);
}
