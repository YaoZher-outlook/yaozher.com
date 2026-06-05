package com.yaozher.v1.strategy.impl;

import com.yaozher.v1.config.AppProperties;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class DefaultEchoSkillBotStrategyTest {

    @Test
    void detectsOpenAiProjectKeysAndExplicitPrefixes() {
        assertThat(DefaultEchoSkillBotStrategy.resolveCredential("sk-proj-example").provider())
                .isEqualTo(DefaultEchoSkillBotStrategy.ChatbotProvider.OPENAI);
        assertThat(DefaultEchoSkillBotStrategy.resolveCredential("openai:sk-legacy-example"))
                .satisfies(credential -> {
                    assertThat(credential.provider()).isEqualTo(DefaultEchoSkillBotStrategy.ChatbotProvider.OPENAI);
                    assertThat(credential.apiKey()).isEqualTo("sk-legacy-example");
                });
    }

    @Test
    void keepsDeepSeekAsDefaultForAmbiguousKeys() {
        assertThat(DefaultEchoSkillBotStrategy.resolveCredential("sk-deepseek-example").provider())
                .isEqualTo(DefaultEchoSkillBotStrategy.ChatbotProvider.DEEPSEEK);
        assertThat(DefaultEchoSkillBotStrategy.resolveCredential("deepseek:sk-example").apiKey())
                .isEqualTo("sk-example");
    }

    @Test
    void resolvesProviderSpecificEndpointAndModel() {
        AppProperties.Chatbot chatbot = new AppProperties.Chatbot();
        chatbot.setApiUrl("https://api.deepseek.com/chat/completions");
        chatbot.setModel("deepseek-v4-flash");
        chatbot.setOpenaiApiUrl("https://api.openai.com/v1/chat/completions");
        chatbot.setOpenaiModel("gpt-5.4-mini");

        assertThat(DefaultEchoSkillBotStrategy.resolveTarget(
                chatbot,
                DefaultEchoSkillBotStrategy.ChatbotProvider.OPENAI
        )).satisfies(target -> {
            assertThat(target.apiUrl()).isEqualTo("https://api.openai.com/v1/chat/completions");
            assertThat(target.model()).isEqualTo("gpt-5.4-mini");
        });
    }
}
