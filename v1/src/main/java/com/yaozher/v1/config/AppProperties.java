package com.yaozher.v1.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.util.ArrayList;
import java.util.List;

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
    private String avatarDir = "./avatars";

    /**
     * 头像访问 URL 前缀
     */
    private String avatarUrlPrefix = "/avatars/";

    /**
     * Global background image storage directory.
     */
    private String backgroundDir = "./backgrounds";

    /**
     * Global background image URL prefix.
     */
    private String backgroundUrlPrefix = "/backgrounds/";

    private String backgroundPresetDir = "./storage/assets/background-presets";

    private String backgroundPresetUrlPrefix = "/background-presets/";

    /**
     * 新闻图片存储目录（本地目录）
     */
    private String newsImageDir = "./news-images";

    /**
     * 新闻图片访问 URL 前缀
     */
    private String newsImageUrlPrefix = "/news-images/";

    private String projectCoverDir = "./storage/assets/cover-images";

    private String projectCoverUrlPrefix = "/cover-images/";

    private String projectFileDir = "./storage/assets/resources";

    private String projectFileUrlPrefix = "/resources/";

    /**
     * Music library root. Direct child folders are playlists.
     */
    private String musicDir = "./music-library";

    /**
     * Music static URL prefix.
     */
    private String musicUrlPrefix = "/music/";

    /**
     * Central lyrics directory. When blank, MusicService checks LRCs and LRC
     * folders directly below the music library root.
     */
    private String lyricDir;

    /**
     * Secret used for encrypting user API keys at rest.
     */
    private String apiKeySecret;

    /**
     * Chatbot provider settings. The default keeps the app compatible with
     * OpenAI-style chat completion APIs while still allowing a local override.
     */
    private Chatbot chatbot = new Chatbot();

    private Weather weather = new Weather();

    private Cors cors = new Cors();

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
        private String apiUrl = "https://api.deepseek.com/chat/completions";
        private String model = "deepseek-v4-flash";
        private String openaiApiUrl = "https://api.openai.com/v1/chat/completions";
        private String openaiModel = "gpt-5.4-mini";
        private Integer timeoutSeconds = 20;
    }

    @Data
    public static class Weather {
        private String primaryUrl = "https://api.open-meteo.com/v1/forecast";
        private String fallbackUrl = "https://wttr.in";
        private Integer connectTimeoutSeconds = 4;
        private Integer requestTimeoutSeconds = 10;
    }

    @Data
    public static class Cors {
        private List<String> allowedOrigins = new ArrayList<>();
    }
}
