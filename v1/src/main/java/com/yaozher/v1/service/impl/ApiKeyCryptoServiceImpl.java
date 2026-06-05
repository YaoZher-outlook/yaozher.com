package com.yaozher.v1.service.impl;

import com.yaozher.v1.config.AppProperties;
import com.yaozher.v1.exception.BusinessException;
import com.yaozher.v1.exception.ErrorCode;
import com.yaozher.v1.service.ApiKeyCryptoService;
import com.yaozher.v1.utils.JwtUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

@Service
@RequiredArgsConstructor
public class ApiKeyCryptoServiceImpl implements ApiKeyCryptoService {

    private static final int IV_LENGTH = 12;
    private static final int TAG_BITS = 128;

    private final AppProperties appProperties;
    private final SecureRandom secureRandom = new SecureRandom();

    @Override
    public String encrypt(String plaintext) {
        if (!StringUtils.hasText(plaintext)) {
            return null;
        }
        try {
            byte[] iv = new byte[IV_LENGTH];
            secureRandom.nextBytes(iv);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key(), new GCMParameterSpec(TAG_BITS, iv));
            byte[] encrypted = cipher.doFinal(plaintext.trim().getBytes(StandardCharsets.UTF_8));

            ByteBuffer buffer = ByteBuffer.allocate(iv.length + encrypted.length);
            buffer.put(iv);
            buffer.put(encrypted);
            return Base64.getEncoder().encodeToString(buffer.array());
        } catch (Exception e) {
            throw BusinessException.of(ErrorCode.SYSTEM_ERROR, "API Key 加密失败");
        }
    }

    @Override
    public String decrypt(String payload) {
        if (!StringUtils.hasText(payload)) {
            return null;
        }
        try {
            byte[] all = Base64.getDecoder().decode(payload);
            ByteBuffer buffer = ByteBuffer.wrap(all);
            byte[] iv = new byte[IV_LENGTH];
            buffer.get(iv);
            byte[] encrypted = new byte[buffer.remaining()];
            buffer.get(encrypted);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(TAG_BITS, iv));
            return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw BusinessException.of(ErrorCode.SYSTEM_ERROR, "API Key 解密失败");
        }
    }

    private SecretKeySpec key() throws Exception {
        String secret = appProperties.getApiKeySecret();
        if (!StringUtils.hasText(secret) && appProperties.getJwt() != null) {
            secret = appProperties.getJwt().getSecret();
        }
        if (!StringUtils.hasText(secret)) {
            secret = JwtUtils.DEFAULT_SECRET;
        }
        byte[] digest = MessageDigest.getInstance("SHA-256").digest(secret.getBytes(StandardCharsets.UTF_8));
        return new SecretKeySpec(digest, "AES");
    }
}
