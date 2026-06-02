package com.yaozher.v1.strategy.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yaozher.v1.config.AppProperties;
import com.yaozher.v1.entity.SysSkillBot;
import com.yaozher.v1.service.ApiKeyService;
import com.yaozher.v1.strategy.SkillBotStrategy;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class DefaultEchoSkillBotStrategy implements SkillBotStrategy {

    private final ApiKeyService apiKeyService;
    private final AppProperties appProperties;
    private final ObjectMapper objectMapper;

    @Override
    public boolean support(SysSkillBot bot) {
        return true;
    }

    @Override
    public String reply(SysSkillBot bot, Long userId, String content) {
        String botName = bot == null ? "Bot" : bot.getBotName();
        String apiKey = apiKeyService.resolveChatbotApiKey(userId);
        if (!StringUtils.hasText(apiKey)) {
            return botName + " 暂未配置可用的 API Key。请在设置页保存自己的 API Key，或由 ADMIN 配置普通用户 chatbot key。";
        }

        AppProperties.Chatbot chatbot = appProperties.getChatbot();
        if (chatbot == null || !StringUtils.hasText(chatbot.getApiUrl())) {
            return botName + " 的 API endpoint 未配置。";
        }

        try {
            Map<String, Object> requestBody = new LinkedHashMap<>();
            requestBody.put("model", StringUtils.hasText(chatbot.getModel()) ? chatbot.getModel() : "deepseek-v4-flash");
            requestBody.put("messages", List.of(
                    Map.of(
                            "role", "system",
                            "content", "You are " + botName + ", a concise assistant for a personal website chat."
                    ),
                    Map.of(
                            "role", "user",
                            "content", content == null ? "" : content
                    )
            ));
            if (chatbot.getApiUrl().contains("deepseek.com")) {
                requestBody.put("thinking", Map.of("type", "disabled"));
            }
            String body = objectMapper.writeValueAsString(requestBody);

            int timeout = chatbot.getTimeoutSeconds() == null ? 20 : Math.max(5, chatbot.getTimeoutSeconds());
            HttpRequest request = HttpRequest.newBuilder(URI.create(chatbot.getApiUrl()))
                    .timeout(Duration.ofSeconds(timeout))
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();
            HttpClient client = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(timeout))
                    .build();
            HttpResponse<String> response = client
                    .send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                return botName + " 调用失败，HTTP " + response.statusCode() + "。";
            }

            JsonNode root = objectMapper.readTree(response.body());
            String reply = root.at("/choices/0/message/content").asText();
            if (StringUtils.hasText(reply)) {
                return reply.trim();
            }
            return botName + " 已收到响应，但响应内容为空。";
        } catch (Exception e) {
            return botName + " 调用失败：" + e.getMessage();
        }
    }
}
