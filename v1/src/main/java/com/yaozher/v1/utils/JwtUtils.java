package com.yaozher.v1.utils;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Map;

/**
 * JWT 工具类（HS256）
 */
public class JwtUtils {

    private JwtUtils() {
    }

    /**
     * 注意：生产环境请通过配置中心/环境变量注入，并确保长度足够。
     * HS256 建议 >= 32 bytes。
     */
    public static final String DEFAULT_SECRET = "PLEASE_CHANGE_ME_TO_A_LONG_RANDOM_SECRET_32B+";

    public static String generateToken(String subject, Map<String, Object> claims, long expireMillis, String secret) {
        Date now = new Date();
        Date exp = new Date(now.getTime() + expireMillis);
        SecretKey key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));

        return Jwts.builder()
                .subject(subject)
                .claims(claims)
                .issuedAt(now)
                .expiration(exp)
                .signWith(key)
                .compact();
    }

    public static Claims parseToken(String token, String secret) {
        SecretKey key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public static boolean isExpired(Claims claims) {
        Date exp = claims.getExpiration();
        return exp != null && exp.before(new Date());
    }
}
