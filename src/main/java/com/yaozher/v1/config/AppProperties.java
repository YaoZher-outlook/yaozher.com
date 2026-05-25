package com.yaozher.v1.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "app")
public class AppProperties {

    /**
     * 上传目录
     */
    private String uploadDir;

    /**
     * JWT 密钥（生产务必外置）
     */
    private Jwt jwt = new Jwt();

    @Data
    public static class Jwt {
        private String secret;
        private Long expireMillis = 7 * 24 * 60 * 60 * 1000L;
    }
}
