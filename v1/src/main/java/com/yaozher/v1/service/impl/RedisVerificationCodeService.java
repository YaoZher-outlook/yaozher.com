package com.yaozher.v1.service.impl;

import com.yaozher.v1.exception.BusinessException;
import com.yaozher.v1.exception.ErrorCode;
import com.yaozher.v1.service.VerificationCodePurpose;
import com.yaozher.v1.service.VerificationCodeService;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.HexFormat;

@Service
@RequiredArgsConstructor
public class RedisVerificationCodeService implements VerificationCodeService {

    private static final Duration CODE_TTL = Duration.ofMinutes(10);
    private static final Duration SEND_COOLDOWN = Duration.ofSeconds(60);
    private static final Duration IP_SEND_WINDOW = Duration.ofMinutes(10);
    private static final Duration LOOKUP_INTERVAL = Duration.ofSeconds(3);
    private static final Duration LOOKUP_WINDOW = Duration.ofMinutes(10);
    private static final int MAX_SENDS_PER_IP_WINDOW = 10;
    private static final int MAX_LOOKUPS_PER_IP_WINDOW = 20;
    private static final int MAX_VERIFY_ATTEMPTS = 5;
    private static final String KEY_PREFIX = "yaozher:verification:";

    private final StringRedisTemplate redisTemplate;
    private final SecureRandom secureRandom = new SecureRandom();

    @Override
    public void guardEmailLookup(String email, String clientIp) {
        try {
            String ipToken = digest(StringUtils.hasText(clientIp) ? clientIp : "unknown");
            Boolean allowed = redisTemplate.opsForValue().setIfAbsent(
                    KEY_PREFIX + "lookup:cooldown:" + ipToken,
                    digest(email),
                    LOOKUP_INTERVAL
            );
            if (!Boolean.TRUE.equals(allowed)) {
                throw BusinessException.of(ErrorCode.BIZ_ERROR, "邮箱查询过于频繁，请稍后再试");
            }

            String windowKey = KEY_PREFIX + "lookup:window:" + ipToken;
            Long lookups = redisTemplate.opsForValue().increment(windowKey);
            if (lookups != null && lookups == 1L) {
                redisTemplate.expire(windowKey, LOOKUP_WINDOW);
            }
            if (lookups != null && lookups > MAX_LOOKUPS_PER_IP_WINDOW) {
                throw BusinessException.of(ErrorCode.BIZ_ERROR, "邮箱查询请求过多，请稍后再试");
            }
        } catch (BusinessException e) {
            throw e;
        } catch (DataAccessException e) {
            throw BusinessException.of(ErrorCode.SYSTEM_ERROR, "验证码服务暂时不可用，请稍后再试");
        }
    }

    @Override
    public String issue(String email, VerificationCodePurpose purpose, String scope, String clientIp) {
        try {
            enforceIpSendLimit(clientIp);

            String token = token(email, purpose, scope);
            Boolean allowed = redisTemplate.opsForValue()
                    .setIfAbsent(cooldownKey(token), "1", SEND_COOLDOWN);
            if (!Boolean.TRUE.equals(allowed)) {
                throw BusinessException.of(ErrorCode.BIZ_ERROR, "验证码发送太频繁，请稍后再试");
            }

            String code = String.format("%06d", secureRandom.nextInt(1_000_000));
            redisTemplate.opsForValue().set(codeKey(token), code, CODE_TTL);
            redisTemplate.delete(attemptKey(token));
            return code;
        } catch (BusinessException e) {
            throw e;
        } catch (DataAccessException e) {
            throw BusinessException.of(ErrorCode.SYSTEM_ERROR, "验证码服务暂时不可用，请稍后再试");
        }
    }

    @Override
    public void verify(String email, String code, VerificationCodePurpose purpose, String scope) {
        try {
            String token = token(email, purpose, scope);
            String storedCode = redisTemplate.opsForValue().get(codeKey(token));
            if (!StringUtils.hasText(storedCode)) {
                invalidateByToken(token);
                throw BusinessException.of(ErrorCode.BIZ_ERROR, "验证码已过期，请重新获取");
            }
            if (storedCode.equals(code)) {
                invalidateByToken(token);
                return;
            }

            Long attempts = redisTemplate.opsForValue().increment(attemptKey(token));
            redisTemplate.expire(attemptKey(token), CODE_TTL);
            if (attempts != null && attempts >= MAX_VERIFY_ATTEMPTS) {
                invalidateByToken(token);
                throw BusinessException.of(ErrorCode.BIZ_ERROR, "验证码尝试次数过多，请重新获取");
            }
            throw BusinessException.of(ErrorCode.BIZ_ERROR, "验证码不正确");
        } catch (BusinessException e) {
            throw e;
        } catch (DataAccessException e) {
            throw BusinessException.of(ErrorCode.SYSTEM_ERROR, "验证码服务暂时不可用，请稍后再试");
        }
    }

    @Override
    public void invalidate(String email, VerificationCodePurpose purpose, String scope) {
        try {
            String token = token(email, purpose, scope);
            invalidateByToken(token);
            redisTemplate.delete(cooldownKey(token));
        } catch (DataAccessException ignored) {
            // Invalidating a failed send is best-effort; normal operations still report Redis failures.
        }
    }

    private void enforceIpSendLimit(String clientIp) {
        String key = KEY_PREFIX + "ip:" + digest(StringUtils.hasText(clientIp) ? clientIp : "unknown");
        Long sends = redisTemplate.opsForValue().increment(key);
        if (sends != null && sends == 1L) {
            redisTemplate.expire(key, IP_SEND_WINDOW);
        }
        if (sends != null && sends > MAX_SENDS_PER_IP_WINDOW) {
            throw BusinessException.of(ErrorCode.BIZ_ERROR, "验证码请求过于频繁，请稍后再试");
        }
    }

    private void invalidateByToken(String token) {
        redisTemplate.delete(codeKey(token));
        redisTemplate.delete(attemptKey(token));
    }

    private String token(String email, VerificationCodePurpose purpose, String scope) {
        String normalizedScope = StringUtils.hasText(scope) ? scope : "public";
        return purpose.name().toLowerCase() + ":" + digest(normalizedScope + "|" + email);
    }

    private String codeKey(String token) {
        return KEY_PREFIX + "code:" + token;
    }

    private String cooldownKey(String token) {
        return KEY_PREFIX + "cooldown:" + token;
    }

    private String attemptKey(String token) {
        return KEY_PREFIX + "attempt:" + token;
    }

    private String digest(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            throw BusinessException.of(ErrorCode.SYSTEM_ERROR, "验证码服务暂时不可用，请稍后再试");
        }
    }
}
