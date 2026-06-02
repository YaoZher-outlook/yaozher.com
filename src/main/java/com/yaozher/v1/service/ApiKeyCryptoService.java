package com.yaozher.v1.service;

public interface ApiKeyCryptoService {

    String encrypt(String plaintext);

    String decrypt(String payload);
}
