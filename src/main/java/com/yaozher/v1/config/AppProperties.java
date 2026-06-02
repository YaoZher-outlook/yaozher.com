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
     * 头像文件存储目录（本地目录，不是数据库 schema）
     */
    private String avatarDir = "./avatar";

    /**
     * 头像访问 URL 前缀
     */
    private String avatarUrlPrefix = "/avatars/";

    /**
     * Global background image storage directory.
     */
    private String backgroundDir = "./background";

    /**
     * Global background image URL prefix.
     */
    private String backgroundUrlPrefix = "/backgrounds/";

    /**
     * 新闻图片存储目录（本地目录）
     */
    private String newsImageDir = "./news-images";

    /**
     * 新闻图片访问 URL 前缀
     */
    private String newsImageUrlPrefix = "/news-images/";

    /**
     * Music library root. Direct child folders are playlists.
     */
    private String musicDir = "./music-library";

    /**
     * Music static URL prefix.
     */
    private String musicUrlPrefix = "/music/";

    /**
     * Secret used for encrypting user API keys at rest.
     */
    private String apiKeySecret;

    /**
     * Chatbot provider settings. The default keeps the app compatible with
     * OpenAI-style chat completion APIs while still allowing a local override.
     */
    private Chatbot chatbot = new Chatbot();

    /**
     * JWT 密钥（生产务必外置）
     */
    private Jwt jwt = new Jwt();

    @Data
    public static class Jwt {
        private String secret;
        private Long expireMillis = 7 * 24 * 60 * 60 * 1000L;
    }

    @Data
    public static class Chatbot {
        private String apiUrl = "https://api.openai.com/v1/chat/completions";
        private String model = "gpt-4o-mini";
        private Integer timeoutSeconds = 20;
    }
}
