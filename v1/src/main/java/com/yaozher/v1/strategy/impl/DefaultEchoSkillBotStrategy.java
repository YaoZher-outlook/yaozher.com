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
import java.util.Locale;
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
        ChatbotCredential credential = resolveCredential(apiKey);
        if (!StringUtils.hasText(credential.apiKey())) {
            return botName + " 的 API Key 配置不完整，请在设置页重新保存。";
        }
        ChatbotTarget target = resolveTarget(chatbot, credential.provider());
        if (target == null) {
            return botName + " 的 API endpoint 未配置。";
        }

        try {
            Map<String, Object> requestBody = new LinkedHashMap<>();
            requestBody.put("model", target.model());
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
            if (credential.provider() == ChatbotProvider.DEEPSEEK) {
                requestBody.put("thinking", Map.of("type", "disabled"));
            }
            String body = objectMapper.writeValueAsString(requestBody);

            int timeout = chatbot.getTimeoutSeconds() == null ? 20 : Math.max(5, chatbot.getTimeoutSeconds());
            HttpRequest request = HttpRequest.newBuilder(URI.create(target.apiUrl()))
                    .timeout(Duration.ofSeconds(timeout))
                    .header("Authorization", "Bearer " + credential.apiKey())
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();
            HttpClient client = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(timeout))
                    .build();
            HttpResponse<String> response = client
                    .send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                return providerError(botName, credential.provider(), response.statusCode());
            }

            JsonNode root = objectMapper.readTree(response.body());
            String reply = root.at("/choices/0/message/content").asText();
            if (StringUtils.hasText(reply)) {
                return reply.trim();
            }
            return botName + " 已收到响应，但响应内容为空。";
        } catch (Exception e) {
            return botName + " 连接 " + providerName(credential.provider()) + " 失败，请稍后再试。";
        }
    }

    static ChatbotCredential resolveCredential(String rawApiKey) {
        String value = rawApiKey == null ? "" : rawApiKey.trim();
        String lower = value.toLowerCase(Locale.ROOT);
        if (lower.startsWith("openai:")) {
            return new ChatbotCredential(ChatbotProvider.OPENAI, value.substring("openai:".length()).trim());
        }
        if (lower.startsWith("deepseek:")) {
            return new ChatbotCredential(ChatbotProvider.DEEPSEEK, value.substring("deepseek:".length()).trim());
        }
        if (lower.startsWith("sk-proj-") || lower.startsWith("sk-svcacct-") || lower.startsWith("sk-admin-")) {
            return new ChatbotCredential(ChatbotProvider.OPENAI, value);
        }
        return new ChatbotCredential(ChatbotProvider.DEEPSEEK, value);
    }

    static ChatbotTarget resolveTarget(AppProperties.Chatbot chatbot, ChatbotProvider provider) {
        if (chatbot == null) {
            return null;
        }
        if (provider == ChatbotProvider.OPENAI) {
            String apiUrl = chatbot.getOpenaiApiUrl();
            if (!StringUtils.hasText(apiUrl)) {
                return null;
            }
            String model = StringUtils.hasText(chatbot.getOpenaiModel()) ? chatbot.getOpenaiModel() : "gpt-5.4-mini";
            return new ChatbotTarget(apiUrl.trim(), model.trim());
        }

        String apiUrl = chatbot.getApiUrl();
        if (!StringUtils.hasText(apiUrl)) {
            return null;
        }
        String model = StringUtils.hasText(chatbot.getModel()) ? chatbot.getModel() : "deepseek-v4-flash";
        return new ChatbotTarget(apiUrl.trim(), model.trim());
    }

    private String providerError(String botName, ChatbotProvider provider, int statusCode) {
        String providerName = providerName(provider);
        return switch (statusCode) {
            case 401 -> botName + " 的 " + providerName + " API Key 无效、已撤销或未获授权，请检查设置中的密钥。";
            case 403 -> botName + " 的 " + providerName + " API Key 没有调用当前模型的权限。";
            case 429 -> botName + " 的 " + providerName + " 调用额度不足或请求过于频繁，请稍后再试。";
            default -> statusCode >= 500
                    ? botName + " 连接 " + providerName + " 服务失败，请稍后再试。"
                    : botName + " 调用 " + providerName + " 失败，HTTP " + statusCode + "。";
        };
    }

    private String providerName(ChatbotProvider provider) {
        return provider == ChatbotProvider.OPENAI ? "OpenAI" : "DeepSeek";
    }

    enum ChatbotProvider {
        DEEPSEEK,
        OPENAI
    }

    record ChatbotCredential(ChatbotProvider provider, String apiKey) {
    }

    record ChatbotTarget(String apiUrl, String model) {
    }
}
